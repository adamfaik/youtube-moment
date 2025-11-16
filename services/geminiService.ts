import { GoogleGenAI, Type } from "@google/genai";
import { VideoSuggestion } from '../types';
import { searchVideos, getDurationRange, type YouTubeVideoData } from './youtubeService';

const API_KEY = process.env.API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

if (!YOUTUBE_API_KEY) {
  throw new Error("YOUTUBE_API_KEY environment variable not set. Please set your YouTube Data API v3 key.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Schema for Gemini's response when selecting from real videos
const geminiSelectionSchema = {
  type: Type.OBJECT,
  properties: {
    selectedVideoId: { 
      type: Type.STRING, 
      description: "The videoId of the best video from the provided list that matches the user's mood and time preference." 
    },
    tags: {
      type: Type.ARRAY,
      description: "An array of 3-5 relevant string tags or keywords describing the video's content that align with the user's mood (e.g., 'Science', 'Physics', 'Aviation').",
      items: { type: Type.STRING }
    },
    promotionalSummary: { 
      type: Type.STRING, 
      description: "A single, combined promotional paragraph (3-4 sentences). It should be compelling and explain why this video is the perfect 'moment' for the user's mood and time, seamlessly blending the reason for the recommendation with a summary of the content." 
    }
  },
  required: ["selectedVideoId", "tags", "promotionalSummary"]
};

const getTimeDescription = (time: number): string => {
  if (time <= 5) return "around 5 minutes long or less";
  if (time > 5 && time <= 15) return "between 5 and 15 minutes long";
  if (time > 15 && time <= 30) return "between 15 and 30 minutes long";
  if (time > 30 && time <= 60) return "between 30 and 60 minutes long";
  return "between 1 and 2 hours long";
};

export const fetchVideoSuggestion = async (time: number, moods: string[]): Promise<VideoSuggestion> => {
  const timeDesc = getTimeDescription(time);
  const moodDesc = moods.join(', ');
  
  try {
    // Step 1: Build search queries from moods
    // Create multiple search queries to get diverse results
    const searchQueries = moods.map(mood => {
      // Remove emoji and clean up mood text for search
      const cleanMood = mood.replace(/[^\w\s]/g, '').trim();
      return cleanMood || mood;
    });

    // Step 2: Search YouTube for real videos
    const durationRange = getDurationRange(time);
    let allVideos: YouTubeVideoData[] = [];

    // Search with each mood query and combine results
    for (const query of searchQueries) {
      try {
        const videos = await searchVideos(
          query,
          YOUTUBE_API_KEY,
          15, // Get 15 results per query
          durationRange.min,
          durationRange.max
        );
        allVideos.push(...videos);
      } catch (searchError) {
        console.warn(`Search failed for query "${query}":`, searchError);
        // Continue with other queries
      }
    }

    // Remove duplicates and limit results
    const uniqueVideos = Array.from(
      new Map(allVideos.map(v => [v.videoId, v])).values()
    ).slice(0, 20); // Limit to top 20 unique videos

    if (uniqueVideos.length === 0) {
      throw new Error(`No videos found matching your preferences. Try adjusting your time or mood selection.`);
    }

    // Step 3: Present videos to Gemini and have it select the best one
    const videosList = uniqueVideos.map((video, index) => 
      `${index + 1}. Video ID: ${video.videoId}\n   Title: ${video.title}\n   Channel: ${video.channelName}\n   Duration: ${video.durationFormatted}\n   Description: ${video.description.substring(0, 200)}...`
    ).join('\n\n');

    const selectionPrompt = `You are "Moment", an expert YouTube concierge. Your purpose is to select the perfect video for a user based on their moods and available time.

User's request:
- Time Available: A video that is ${timeDesc}, with a duration as close to ${time} minutes as possible.
- Current Moods: ${moodDesc}

Here are ${uniqueVideos.length} real YouTube videos that match the duration criteria. Select the ONE best video that:
1. Best matches the user's current moods
2. Is a "hidden gem" - high-quality and engaging, not just a generic viral hit
3. The user likely hasn't seen before
4. Has a duration closest to ${time} minutes

Available videos:
${videosList}

Select the best video by its videoId and provide tags and a compelling promotional summary.`;

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: selectionPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: geminiSelectionSchema,
        temperature: 0.8,
      },
    });

    const jsonText = geminiResponse.text.trim();
    let selectionData;
    
    try {
      selectionData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error. Raw response:", jsonText);
      throw new Error(`Invalid response from Gemini. Please try again.`);
    }
    
    if (!selectionData.selectedVideoId) {
      throw new Error("Gemini did not select a valid video. Please try again.");
    }

    // Step 4: Find the selected video in our list
    const selectedVideo = uniqueVideos.find(v => v.videoId === selectionData.selectedVideoId);
    
    if (!selectedVideo) {
      // Fallback: use the first video if selection doesn't match
      console.warn(`Selected video ID ${selectionData.selectedVideoId} not found in results. Using first video.`);
      const fallbackVideo = uniqueVideos[0];
      
      return {
        title: fallbackVideo.title,
        youtubeUrl: `https://www.youtube.com/watch?v=${fallbackVideo.videoId}`,
        thumbnailUrl: fallbackVideo.thumbnailUrl,
        channelName: fallbackVideo.channelName,
        duration: fallbackVideo.durationFormatted,
        tags: selectionData.tags || [],
        promotionalSummary: selectionData.promotionalSummary || `A perfect ${time}-minute video for your current mood.`,
      };
    }

    // Step 5: Construct the final suggestion with real YouTube data + AI-generated content
    const suggestion: VideoSuggestion = {
      title: selectedVideo.title,
      youtubeUrl: `https://www.youtube.com/watch?v=${selectedVideo.videoId}`,
      thumbnailUrl: selectedVideo.thumbnailUrl,
      channelName: selectedVideo.channelName,
      duration: selectedVideo.durationFormatted,
      tags: selectionData.tags || [],
      promotionalSummary: selectionData.promotionalSummary,
    };

    return suggestion;
  } catch (error) {
    console.error("Error fetching video suggestion:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes("API_KEY") || error.message.includes("apiKey")) {
        throw new Error("API key error. Please check your .env.local file and ensure both GEMINI_API_KEY and YOUTUBE_API_KEY are set correctly.");
      }
      
      if (error.message.includes("quota") || error.message.includes("Quota")) {
        throw new Error("API quota exceeded. Please check your API usage limits.");
      }
      
      if (error.message.includes("network") || error.message.includes("fetch")) {
        throw new Error("Network error. Please check your internet connection and try again.");
      }
      
      // Return the actual error message
      throw error;
    }
    
    throw new Error("Failed to get a suggestion. Please check the browser console for details and try again.");
  }
};
