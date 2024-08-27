type PaginationParams = {
    page: number;
    perPage: number;
}

type PaginatedResult<T> = {
    data: T[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
}

export type { PaginationParams, PaginatedResult };