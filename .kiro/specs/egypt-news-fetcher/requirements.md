# Requirements Document

## Introduction

The Egypt News Fetcher & Integration feature is designed to provide a comprehensive news aggregation service specifically focused on Egypt-relevant content. This system will fetch, normalize, cache, and serve current news articles in both Arabic and English languages through a reliable, low-latency API. The feature aims to support the Egypto AI mobile application with high-quality, deduplicated news content while maintaining cost efficiency and content safety.

## Requirements

### Requirement 1

**User Story:** As a mobile app user, I want to access current Egypt-relevant news in both Arabic and English, so that I can stay informed about local and regional developments in my preferred language.

#### Acceptance Criteria

1. WHEN a user requests news THEN the system SHALL return Egypt-relevant articles in Arabic and English within 800ms p95 for cache hits
2. WHEN a user requests news with cache miss THEN the system SHALL return results within 2.5s p95
3. WHEN a user specifies language preference THEN the system SHALL filter results to match the requested language (ar|en)
4. WHEN no language is specified THEN the system SHALL default to Arabic (ar)
5. WHEN articles are returned THEN they SHALL be sorted by publishedAt timestamp in Africa/Cairo timezone

### Requirement 2

**User Story:** As a mobile app user, I want to filter news by categories and search terms, so that I can find specific content relevant to my interests.

#### Acceptance Criteria

1. WHEN a user provides a search query THEN the system SHALL return articles matching the query terms
2. WHEN a user selects a category THEN the system SHALL filter results by politics, economy, sports, culture, tech, or travel categories
3. WHEN a user specifies date range THEN the system SHALL return articles within the from/to date parameters
4. WHEN a user requests pagination THEN the system SHALL support page and pageSize parameters with default pageSize of 20
5. WHEN a user specifies sorting preference THEN the system SHALL sort by publishedAt or relevancy
6. WHEN safeSearch is enabled THEN the system SHALL filter out inappropriate content

### Requirement 3

**User Story:** As a system administrator, I want the news service to aggregate from multiple reliable sources with fallback mechanisms, so that the service remains available even when primary providers fail.

#### Acceptance Criteria

1. WHEN primary news providers are available THEN the system SHALL fetch from 1-2 turnkey providers (NewsAPI, Currents, Mediastack, or GDELT)
2. WHEN primary providers fail THEN the system SHALL fallback to RSS feeds from official outlets and Google News RSS
3. WHEN any provider fails THEN the system SHALL implement exponential backoff with jitter for retry attempts
4. WHEN provider outages occur THEN the system SHALL provide graceful degradation with ≥85% service availability
5. WHEN multiple providers are configured THEN the system SHALL use weighted round-robin with health checks

### Requirement 4

**User Story:** As a system administrator, I want articles to be normalized and deduplicated, so that users receive consistent, high-quality content without redundancy.

#### Acceptance Criteria

1. WHEN articles are fetched from multiple sources THEN the system SHALL normalize them into a unified NewsArticle interface
2. WHEN duplicate articles are detected THEN the system SHALL deduplicate ≥85% of identical cross-source stories using URL canonicalization and title+source fuzzy hashing
3. WHEN articles are processed THEN each SHALL have a stable hash ID for consistent identification
4. WHEN articles contain images THEN the system SHALL validate and optionally proxy image URLs
5. WHEN articles are stored THEN they SHALL include source attribution, category, language, and relevance scoring

### Requirement 5

**User Story:** As a mobile app user, I want fast access to news content, so that I can quickly browse articles without waiting for slow loading times.

#### Acceptance Criteria

1. WHEN frequently requested content is accessed THEN the system SHALL serve from in-memory LRU cache
2. WHEN cache expires THEN the system SHALL refresh content with 5-15 minute TTL via Redis
3. WHEN background jobs run THEN the system SHALL pre-populate cache for trending categories and languages
4. WHEN cache keys are generated THEN they SHALL be based on query parameter hashes for efficient lookup
5. WHEN persistent storage is used THEN it SHALL store trending stories for analytics and quick access

### Requirement 6

**User Story:** As an API consumer, I want a well-documented REST API with proper error handling, so that I can reliably integrate the news service into applications.

#### Acceptance Criteria

1. WHEN accessing the news endpoint THEN the system SHALL provide GET /v1/news with pagination and filtering support
2. WHEN requesting trending news THEN the system SHALL provide GET /v1/news/trending with 24-48h aggregated data
3. WHEN requesting specific articles THEN the system SHALL provide GET /v1/news/:id for individual article access
4. WHEN API responses are returned THEN they SHALL include HATEOAS-style pagination links
5. WHEN rate limits are exceeded THEN the system SHALL return 429 status with retryAfter hints
6. WHEN errors occur THEN the system SHALL return appropriate HTTP status codes with descriptive error messages
7. WHEN API documentation is needed THEN the system SHALL provide auto-generated OpenAPI 3.1 specification

### Requirement 7

**User Story:** As a system administrator, I want comprehensive monitoring and observability, so that I can maintain service reliability and performance.

#### Acceptance Criteria

1. WHEN system operations occur THEN the system SHALL log structured events using pino with request IDs
2. WHEN metrics are collected THEN the system SHALL track provider latency, error rates, cache hit ratios, and articles per minute
3. WHEN monitoring dashboards are accessed THEN they SHALL display Prometheus-compatible metrics
4. WHEN deduplication runs THEN the system SHALL track and report deduplication rates
5. WHEN feature flags are configured THEN they SHALL control providers, summarization, and safeSearch features

### Requirement 8

**User Story:** As a system administrator, I want secure configuration management and content validation, so that the service operates safely and complies with security requirements.

#### Acceptance Criteria

1. WHEN configuration is loaded THEN all secrets SHALL be stored in environment variables with zod schema validation
2. WHEN HTML content is processed THEN the system SHALL validate and escape all outbound HTML
3. WHEN provider authentication is required THEN API keys SHALL be securely managed through .env configuration
4. WHEN content filtering is enabled THEN the system SHALL apply toxicity/NSFW filters for images and titles
5. WHEN commercial use is considered THEN the system SHALL document license requirements for each provider

### Requirement 9

**User Story:** As a developer, I want comprehensive test coverage and quality assurance, so that the system is reliable and maintainable.

#### Acceptance Criteria

1. WHEN unit tests are executed THEN they SHALL cover adapters, deduplication, and ranking algorithms
2. WHEN integration tests run THEN they SHALL use mocked provider responses and live smoke tests
3. WHEN API contracts are tested THEN they SHALL validate against OpenAPI specification using supertest
4. WHEN load testing is performed THEN the system SHALL handle 100 requests per second baseline using k6
5. WHEN CI/CD runs THEN all tests SHALL pass including offline scenarios using mocks

### Requirement 10

**User Story:** As a system administrator, I want Egypt-specific content relevance and localization, so that users receive the most pertinent news for their region.

#### Acceptance Criteria

1. WHEN relevance scoring is applied THEN the system SHALL prioritize Egypt sources and content mentioning Egypt/مصر/القاهرة/الإسكندرية
2. WHEN regional content is included THEN it SHALL only be added if Egypt relevance score exceeds configured threshold
3. WHEN timezone handling is required THEN all timestamps SHALL be normalized to Africa/Cairo timezone
4. WHEN transliteration is requested THEN the system SHALL support Arabic <> Latin character conversion for search UX
5. WHEN content summarization is enabled THEN it SHALL generate summaries in the requested language (Arabic or English)