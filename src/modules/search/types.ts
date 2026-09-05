export type SearchSuggestionProduct = {
  type: "product";
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: string;
  compareAtPrice: string | null;
  availability: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "AVAILABLE";
  categoryName: string | null;
  ratingSummary?: { average: number; count: number };
};

export type SearchSuggestionCategory = {
  type: "category";
  id: string;
  slug: string;
  name: string;
  parentName: string | null;
};

export type SearchSuggestions = {
  query: string;
  products: SearchSuggestionProduct[];
  categories: SearchSuggestionCategory[];
};
