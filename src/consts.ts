import site from './data/site.json';
interface Education {
  school: string;
  details?: string;
  period?: string;
}

export const SITE = site as typeof site & {
  avatar?: string;
  bio?: string;
  homeAbout?: string;
  location?: string;
  education?: Education[];
  since?: string;
};
export const SITE_TITLE = site.title;
export const SITE_DESCRIPTION = site.description;
export const SITE_AUTHOR = site.author;
export const HOME_URL = site.homeUrl;
