import { ProjectImage } from '../types';

const VIDEO_EXTENSIONS = /\.(mp4|m4v|mov|webm)(?:$|[?#])/i;

export const isVideoProjectMedia = (media: Pick<ProjectImage, 'name' | 'url'>): boolean =>
    VIDEO_EXTENSIONS.test(media.name || media.url);
