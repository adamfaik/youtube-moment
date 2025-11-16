/**
 * YouTube Data API v3 Service
 * 
 * This service validates video IDs and fetches accurate metadata from YouTube.
 * It ensures that all video data is correct and up-to-date.
 */

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  duration: string; // ISO 8601 duration (e.g., "PT14M32S")
  durationFormatted: string; // Human-readable (e.g., "14:32")
  thumbnailUrl: string;
  publishedAt: string;
  description: string;
  viewCount?: number;
}

export interface YouTubeApiError {
  code: number;
  message: string;
  errors?: Array<{ message: string; domain: string; reason: string }>;
}

/**
 * Converts ISO 8601 duration (PT14M32S) to human-readable format (14:32)
 */
const formatDuration = (isoDuration: string): string => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Validates and fetches video data from YouTube Data API v3
 * 
 * @param videoId - The 11-character YouTube video ID
 * @param apiKey - Your YouTube Data API v3 key
 * @returns Promise with validated video data or throws error
 */
export const validateAndFetchVideoData = async (
  videoId: string,
  apiKey: string
): Promise<YouTubeVideoData> => {
  // Validate video ID format (11 characters, alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error(`Invalid video ID format: ${videoId}. YouTube video IDs must be exactly 11 characters.`);
  }

  const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  apiUrl.searchParams.set('id', videoId);
  apiUrl.searchParams.set('key', apiKey);
  apiUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
  apiUrl.searchParams.set('fields', 'items(id,snippet(title,channelTitle,channelId,description,publishedAt,thumbnails),contentDetails(duration),statistics(viewCount))');

  try {
    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      const errorData: YouTubeApiError = await response.json().catch(() => ({
        code: response.status,
        message: `HTTP ${response.status}: ${response.statusText}`
      }));

      if (errorData.code === 403) {
        throw new Error('YouTube API quota exceeded or API key invalid. Please check your API key and quota.');
      }
      if (errorData.code === 404) {
        throw new Error(`Video not found: ${videoId}. The video may have been deleted or made private.`);
      }
      throw new Error(`YouTube API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();

    // Check if video exists
    if (!data.items || data.items.length === 0) {
      throw new Error(`Video not found: ${videoId}. The video may have been deleted, made private, or the ID is incorrect.`);
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const statistics = video.statistics;

    // Validate required fields
    if (!snippet || !contentDetails) {
      throw new Error('Invalid video data structure from YouTube API');
    }

    return {
      videoId: video.id,
      title: snippet.title,
      channelName: snippet.channelTitle,
      channelId: snippet.channelId,
      duration: contentDetails.duration,
      durationFormatted: formatDuration(contentDetails.duration),
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
      publishedAt: snippet.publishedAt,
      description: snippet.description || '',
      viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch video data from YouTube API');
  }
};

/**
 * Validates multiple video IDs and returns only valid ones
 * Useful for batch validation or fallback scenarios
 */
export const validateVideoIds = async (
  videoIds: string[],
  apiKey: string
): Promise<YouTubeVideoData[]> => {
  if (videoIds.length === 0) return [];

  // YouTube API allows up to 50 video IDs per request
  const batchSize = 50;
  const results: YouTubeVideoData[] = [];

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    
    const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    apiUrl.searchParams.set('id', batch.join(','));
    apiUrl.searchParams.set('key', apiKey);
    apiUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    apiUrl.searchParams.set('fields', 'items(id,snippet(title,channelTitle,channelId,description,publishedAt,thumbnails),contentDetails(duration),statistics(viewCount))');

    try {
      const response = await fetch(apiUrl.toString());
      if (!response.ok) {
        console.warn(`Batch validation failed for batch starting at index ${i}`);
        continue;
      }

      const data = await response.json();
      if (data.items) {
        for (const video of data.items) {
          const snippet = video.snippet;
          const contentDetails = video.contentDetails;
          const statistics = video.statistics;

          if (snippet && contentDetails) {
            results.push({
              videoId: video.id,
              title: snippet.title,
              channelName: snippet.channelTitle,
              channelId: snippet.channelId,
              duration: contentDetails.duration,
              durationFormatted: formatDuration(contentDetails.duration),
              thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
              publishedAt: snippet.publishedAt,
              description: snippet.description || '',
              viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error validating batch starting at index ${i}:`, error);
    }
  }

  return results;
};

/**
 * Searches for YouTube videos based on query and filters by duration
 * 
 * @param query - Search query string
 * @param apiKey - Your YouTube Data API v3 key
 * @param maxResults - Maximum number of results to return (default: 20)
 * @param minDurationSeconds - Minimum duration in seconds (optional)
 * @param maxDurationSeconds - Maximum duration in seconds (optional)
 * @returns Promise with array of video data
 */
export const searchVideos = async (
  query: string,
  apiKey: string,
  maxResults: number = 20,
  minDurationSeconds?: number,
  maxDurationSeconds?: number
): Promise<YouTubeVideoData[]> => {
  // Step 1: Search for videos
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('key', apiKey);
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', Math.min(maxResults * 2, 50).toString()); // Get more to filter by duration
  // Set videoDuration based on target duration if provided
  if (maxDurationSeconds !== undefined) {
    if (maxDurationSeconds <= 240) { // 4 minutes or less
      searchUrl.searchParams.set('videoDuration', 'short');
    } else if (maxDurationSeconds <= 1200) { // 20 minutes or less
      searchUrl.searchParams.set('videoDuration', 'medium');
    } else {
      searchUrl.searchParams.set('videoDuration', 'long');
    }
  } else {
    searchUrl.searchParams.set('videoDuration', 'medium'); // Default to medium
  }
  searchUrl.searchParams.set('order', 'relevance');

  try {
    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      const errorData: YouTubeApiError = await searchResponse.json().catch(() => ({
        code: searchResponse.status,
        message: `HTTP ${searchResponse.status}: ${searchResponse.statusText}`
      }));

      if (errorData.code === 403) {
        throw new Error('YouTube API quota exceeded or API key invalid. Please check your API key and quota.');
      }
      throw new Error(`YouTube Search API error: ${errorData.message || searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Step 2: Get detailed video information including duration
    const videoIds = searchData.items.map((item: any) => item.id.videoId).filter(Boolean);
    
    if (videoIds.length === 0) {
      return [];
    }

    // Fetch video details
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('id', videoIds.join(','));
    detailsUrl.searchParams.set('key', apiKey);
    detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    detailsUrl.searchParams.set('fields', 'items(id,snippet(title,channelTitle,channelId,description,publishedAt,thumbnails),contentDetails(duration),statistics(viewCount))');

    const detailsResponse = await fetch(detailsUrl.toString());
    
    if (!detailsResponse.ok) {
      throw new Error('Failed to fetch video details from YouTube API');
    }

    const detailsData = await detailsResponse.json();
    
    if (!detailsData.items || detailsData.items.length === 0) {
      return [];
    }

    // Step 3: Filter by duration and format results
    const results: YouTubeVideoData[] = [];
    
    for (const video of detailsData.items) {
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      const statistics = video.statistics;

      if (!snippet || !contentDetails) continue;

      // Parse duration
      const duration = contentDetails.duration;
      const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!durationMatch) continue;

      const hours = parseInt(durationMatch[1] || '0', 10);
      const minutes = parseInt(durationMatch[2] || '0', 10);
      const seconds = parseInt(durationMatch[3] || '0', 10);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      // Filter by duration if specified
      if (minDurationSeconds !== undefined && totalSeconds < minDurationSeconds) continue;
      if (maxDurationSeconds !== undefined && totalSeconds > maxDurationSeconds) continue;

      results.push({
        videoId: video.id,
        title: snippet.title,
        channelName: snippet.channelTitle,
        channelId: snippet.channelId,
        duration: duration,
        durationFormatted: formatDuration(duration),
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
        publishedAt: snippet.publishedAt,
        description: snippet.description || '',
        viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
      });

      // Stop when we have enough results
      if (results.length >= maxResults) break;
    }

    return results;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to search videos from YouTube API');
  }
};

/**
 * Converts minutes to seconds for duration filtering
 */
export const minutesToSeconds = (minutes: number): number => {
  return minutes * 60;
};

/**
 * Gets duration range in seconds based on time preference
 */
export const getDurationRange = (targetMinutes: number): { min: number; max: number } => {
  // Allow ±20% tolerance, with minimum 1 minute and maximum 2x target
  const minSeconds = Math.max(60, Math.floor(targetMinutes * 0.8 * 60));
  const maxSeconds = Math.floor(targetMinutes * 2 * 60);
  return { min: minSeconds, max: maxSeconds };
};
