import { PrismaClient } from '@prisma/client';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import cron from 'node-cron';

const prisma = new PrismaClient();
const twitterClient = new TwitterApi(process.env.X_BEARER_TOKEN!);

interface Trend {
  name: string;
  tweetVolume?: number;
}

interface XPost {
  id: string;
  text: string;
  cleanedText?: string;
  authorId?: string;
  createdAt: string | undefined;
  language?: string;
}

export async function fetchEgyptTrends(): Promise<Trend[]> {
  try {
    // Fetch recent Arabic tweets from Egypt to infer trends
    const response = await twitterClient.v2.search({
      query: 'from:EG',
      max_results: 100,
      'tweet.fields': ['public_metrics'],
    });
    const hashtagCounts: { [key: string]: number } = {};
    for await (const tweet of response) {
      const hashtags = tweet.text.match(/#\w+/g) || [];
      hashtags.forEach(hashtag => {
        hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + (tweet.public_metrics?.retweet_count || 1);
      });
    }
    return Object.entries(hashtagCounts)
      .map(([name, count]) => ({ name, tweetVolume: count }))
      .sort((a, b) => b.tweetVolume - a.tweetVolume)
      .slice(0, 5); // Top 5 trends
  } catch (error) {
    console.error('Error fetching trends:', error);
    return []; // Return empty array to avoid breaking cron
  }
}
export async function fetchTrendingPosts(trendName: string, maxResults: number = 20): Promise<XPost[]> {
  try {
    const response = await twitterClient.v2.search({
      query: `${trendName} lang:ar place_country:EG`,
      max_results: maxResults,
      'tweet.fields': ['created_at', 'author_id', 'lang'],
    });
    const posts: XPost[] = [];
    for await (const tweet of response) {
      if (containsEgyptianSlang(tweet.text)) {
        posts.push({
          id: tweet.id,
          text: tweet.text,
          cleanedText: cleanPostText(tweet.text),
          authorId: tweet.author_id,
          createdAt: tweet.created_at,
          language: tweet.lang,
        });
      }
    }
    return posts;
  } catch (error) {
    console.error(`Error fetching posts for ${trendName}:`, error);
    throw new Error('Failed to fetch posts');
  }
}

function cleanPostText(text: string): string {
  return text.replace(/https?:\/\/\S+/g, '').replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();
}

function containsEgyptianSlang(text: string): boolean {
  const slang = ['كفاية كدة', 'يا باشا', 'إزيك', 'تمام', 'فشيخ', 'قشطة'];
  return slang.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()));
}

export async function storeTrends(trends: Trend[]): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  for (const trend of trends) {
    await prisma.trend.upsert({
      where: { name: trend.name },
      update: { tweetVolume: trend.tweetVolume, fetchedAt: new Date(), expiresAt },
      create: {
        name: trend.name,
        tweetVolume: trend.tweetVolume,
        fetchedAt: new Date(),
        expiresAt,
      },
    });
  }
}

export async function storePosts(posts: XPost[], trendName: string): Promise<void> {
  const trend = await prisma.trend.findUnique({ where: { name: trendName } });
  if (!trend) throw new Error(`Trend ${trendName} not found`);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  for (const post of posts) {
    await prisma.xPost.upsert({
      where: { id: post.id },
      update: {
        text: post.text,
        cleanedText: post.cleanedText,
        authorId: post.authorId,
        createdAt: new Date(post.createdAt ?? ''),
        language: post.language,
        trendId: trend.id,
        expiresAt,
      },
      create: {
        id: post.id,
        text: post.text,
        cleanedText: post.cleanedText,
        authorId: post.authorId,
        createdAt: new Date(post.createdAt ?? ''),
        language: post.language,
        trendId: trend.id,
        expiresAt,
      },
    });
  }
}

async function cleanupStaleData(): Promise<void> {
  const now = new Date();
  await prisma.xPost.deleteMany({ where: { expiresAt: { lte: now } } });
  await prisma.trend.deleteMany({ where: { expiresAt: { lte: now } } });
}

async function getChatContext(query: string): Promise<string> {
  const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const posts = await prisma.xPost.findMany({
    where: {
      AND: keywords.map(keyword => ({
        cleanedText: { contains: keyword, mode: 'insensitive' },
      })),
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { cleanedText: true },
  });
  return posts.map(post => post.cleanedText).filter(Boolean).join('\n');
}

// Cron Job
cron.schedule('0 * * * *', async () => {
  console.log('Fetching Egypt trends...');
  try {
    await cleanupStaleData();
    const trends = await fetchEgyptTrends();
    await storeTrends(trends);
    for (const trend of trends) {
      const posts = await fetchTrendingPosts(trend.name);
      await storePosts(posts, trend.name);
    }
    console.log('Trends updated successfully');
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

