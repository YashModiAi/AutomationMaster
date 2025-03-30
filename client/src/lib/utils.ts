import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeToNow(date: Date | string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  
  // Convert milliseconds to minutes
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  
  // Convert to hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  
  // Convert to days
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  
  // Format date for older dates
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: now.getFullYear() !== dateObj.getFullYear() ? 'numeric' : undefined
  });
}

export function getActionTypeLabel(type: string): string {
  switch (type) {
    case "immediate":
      return "Immediate";
    case "scheduled":
      return "Scheduled";
    default:
      return type;
  }
}

export function formatScheduleDelay(minutes: number): string {
  if (!minutes) return "immediately";
  
  if (minutes < 60) {
    return `after ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `after ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  
  return `after ${hours} hour${hours === 1 ? "" : "s"} and ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
}
