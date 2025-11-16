
export interface VideoSuggestion {
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  channelName: string;
  duration: string; // e.g., "14:32"
  tags: string[];
  promotionalSummary: string;
}