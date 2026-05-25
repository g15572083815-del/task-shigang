export interface CreateCategoryDto {
  versionId: number;
  parentId: number;
  code: string;
  name: string;
  remark?: string | null;
}
