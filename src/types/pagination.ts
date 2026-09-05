export type PageInput = {
  page?: number;
  pageSize?: number;
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  meta: PageMeta;
};
