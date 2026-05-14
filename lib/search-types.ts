export type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
};

export type SearchResultGroup = {
  id: string;
  title: string;
  items: SearchResultItem[];
};
