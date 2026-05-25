export interface CreateDetailDto {
  categoryId: number;
  code: string;
  name: string;
  content?: string | null;
  material?: string | null;
  rule?: string | null;
  unit: string;
}
