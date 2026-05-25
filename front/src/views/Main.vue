<template>
  <div class="page">
    <div class="left">
      <div class="version-bar">
        <el-button type="primary" size="small" @click="versionDialogVisible = true">
          维护版本
        </el-button>

        <el-select
          v-model="versionId"
          size="small"
          style="width: 180px;"
          placeholder="请选择版本"
          :loading="versionLoading"
          @change="onVersionChange"
        >
          <el-option
            v-for="item in versionList"
            :key="item.id"
            :label="formatVersionLabel(item)"
            :value="item.id"
          />
        </el-select>
      </div>

      <div class="category-actions">
        <el-button size="small" @click="addCategoryRow">新增分类</el-button>
        <el-button size="small" :disabled="!canAddSubCategory" @click="addSubCategoryRow">
          新增下级分类
        </el-button>
        <el-button size="small" :disabled="!canMoveCategoryUp" @click="handleCategoryMove('up')">
          上移
        </el-button>
        <el-button size="small" :disabled="!canMoveCategoryDown" @click="handleCategoryMove('down')">
          下移
        </el-button>
      </div>

      <vxe-grid
        ref="categoryGridRef"
        v-bind="categoryGridOptions"
        v-loading="categoryLoading"
        @current-change="onCategorySelect"
        @toggle-tree-expand="onToggleCategoryTreeExpand"
        @edit-closed="onCategoryEditClosed"
        @menu-click="onCategoryMenuClick"
        @cell-menu="onCategoryCellMenu"
      />
    </div>

    <div class="right">
      <div class="toolbar">
        <el-button type="primary" size="small" :disabled="!canAddDetail" @click="addDetailRow">
          新增明细
        </el-button>
        <el-input
          v-model="keyword"
          placeholder="搜索"
          size="small"
          style="width: 200px"
          clearable
        />
      </div>

      <vxe-grid
        ref="detailGridRef"
        v-bind="detailGridOptions"
        v-loading="detailLoading"
        @edit-closed="onDetailEditClosed"
        @menu-click="onDetailMenuClick"
        @cell-menu="onDetailCellMenu"
      />
    </div>

    <VersionDialog v-model="versionDialogVisible" @changed="onVersionDialogChanged" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { VxeGridInstance, VxeGridProps } from 'vxe-table'
import VersionDialog from '../components/VersionDialog.vue'
import {
  createCategory,
  deleteCategory,
  discardCategory,
  enableCategory,
  moveCategory,
  updateCategory,
} from '../api/category'
import {
  createDetail,
  deleteDetail,
  discardDetail,
  enableDetail,
  fetchDetails,
  moveDetail,
  updateDetail,
} from '../api/detail'
import { fetchCategories, fetchVersions } from '../api/version'
import type { Category, Detail, Version } from '../types'
import {
  canMoveDetailDown,
  canMoveDetailUp,
  canMoveDown,
  canMoveUp,
  getRootCategory,
  isLeafCategory,
  isPersistedCategory,
  isRootCategory,
} from '../utils/category'
import { getErrorMessage, isUserCancel } from '../utils/error'

const versionDialogVisible = ref(false)
const versionId = ref<number>()
const keyword = ref('')
const versionLoading = ref(false)
const categoryLoading = ref(false)
const detailLoading = ref(false)
const selectedCategoryId = ref<number>()
const selectedCategory = ref<Category>()

const categoryGridRef = ref<VxeGridInstance>()
const detailGridRef = ref<VxeGridInstance>()

const versionList = ref<Version[]>([])
const tableData = ref<Detail[]>([])

const categoryList = computed(() => (categoryGridOptions.data ?? []) as Category[])

const filteredDetailList = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return tableData.value

  return tableData.value.filter((item) =>
  ['code', 'name', 'content', 'material', 'rule', 'unit'].some((field) => {
      const value = item[field as keyof Detail]
      return value != null && String(value).toLowerCase().includes(text)
    }),
  )
})

const canAddSubCategory = computed(() => {
  return !!selectedCategory.value && !isRootCategory(selectedCategory.value)
})

const canAddDetail = computed(() => {
  const row = selectedCategory.value
  if (!isPersistedCategory(row)) return false
  return !isRootCategory(row) && isLeafCategory(categoryList.value, row.id)
})

const canMoveCategoryUp = computed(() => {
  const row = selectedCategory.value
  if (!isPersistedCategory(row)) return false
  return !isRootCategory(row) && canMoveUp(categoryList.value, row)
})

const canMoveCategoryDown = computed(() => {
  const row = selectedCategory.value
  if (!isPersistedCategory(row)) return false
  return !isRootCategory(row) && canMoveDown(categoryList.value, row)
})

const categoryGridOptions = reactive<VxeGridProps<Category>>({
  border: true,
  size: 'small',
  height: 400,
  rowConfig: { keyField: 'id', isCurrent: true, isHover: true },
  treeConfig: {
    transform: true,
    rowField: 'id',
    parentField: 'parentId',
    expandAll: true,
  },
  editConfig: {
    trigger: 'dblclick',
    mode: 'cell',
    beforeEditMethod: ({ row }) => !isRootCategory(row),
  },
  menuConfig: {
    enabled: true,
    body: {
      options: [
        [
          { code: 'delete', name: '删除行' },
          { code: 'moveUp', name: '上移' },
          { code: 'moveDown', name: '下移' },
          { code: 'discard', name: '废弃' },
          { code: 'enable', name: '启用' },
        ],
      ],
    },
    visibleMethod: ({ row }) => !!row && !isRootCategory(row),
  },
  rowClassName: ({ row }) => {
    const classes: string[] = []
    if (isRootCategory(row)) classes.push('category-root-row')
    if (row.status === '废弃') classes.push('row-disabled')
    return classes.join(' ')
  },
  columns: [
    {
      field: 'code',
      title: '编码',
      width: 100,
      treeNode: true,
      editRender: { name: 'input' },
    },
    { field: 'name', title: '名称', minWidth: 120, editRender: { name: 'input' } },
    { field: 'remark', title: '备注', minWidth: 100, editRender: { name: 'input' } },
  ],
  data: [],
})

const detailGridOptions = reactive<VxeGridProps<Detail>>({
  border: true,
  size: 'small',
  height: 500,
  rowConfig: { isCurrent: true, isHover: true },
  editConfig: { trigger: 'dblclick', mode: 'cell' },
  menuConfig: {
    body: {
      options: [
        [
          { code: 'delete', name: '删除行' },
          { code: 'moveUp', name: '上移' },
          { code: 'moveDown', name: '下移' },
          { code: 'discard', name: '废弃' },
          { code: 'enable', name: '启用' },
        ],
      ],
    },
  },
  rowClassName: ({ row }) => (row.status === '废弃' ? 'row-disabled' : ''),
  columns: [
    { field: 'code', title: '编码', width: 100, editRender: { name: 'input' } },
    { field: 'name', title: '项目名称', minWidth: 120, editRender: { name: 'input' } },
    { field: 'content', title: '工作内容', minWidth: 140, editRender: { name: 'input' } },
    { field: 'material', title: '乙方承担材料', minWidth: 140, editRender: { name: 'input' } },
    { field: 'rule', title: '计算规则', minWidth: 120, editRender: { name: 'input' } },
    { field: 'unit', title: '计量单位', width: 100, editRender: { name: 'input' } },
  ],
  data: [],
})

watch(filteredDetailList, (value) => {
  detailGridOptions.data = value
})

const formatVersionLabel = (item: Version) => {
  return item.enabled ? item.name : `${item.name}（未启用）`
}

const expandCategoryTree = async () => {
  await nextTick()
  const grid = categoryGridRef.value
  if (!grid) return

  await grid.setAllTreeExpand(true)
  const root = getRootCategory(categoryList.value)
  if (root) {
    await grid.setTreeExpand(root, true)
  }
}

const loadDetailList = async (categoryId: number) => {
  if (!isPersistedCategory({ id: categoryId })) {
    clearDetails()
    return
  }

  detailLoading.value = true
  try {
    const { data } = await fetchDetails(categoryId)
    tableData.value = data
    detailGridOptions.data = filteredDetailList.value
  } catch {
    tableData.value = []
    detailGridOptions.data = []
    ElMessage.error('加载明细失败')
  } finally {
    detailLoading.value = false
  }
}

const onCategorySelect = ({ row }: { row?: Category }) => {
  selectedCategory.value = row
  if (!row) {
    clearDetails()
    return
  }

  if (!isPersistedCategory(row)) {
    selectedCategoryId.value = undefined
    clearDetails()
    return
  }

  selectedCategoryId.value = row.id
  loadDetailList(row.id)
}

const onToggleCategoryTreeExpand = ({ row, expanded }: { row: Category; expanded: boolean }) => {
  if (isRootCategory(row) && !expanded) {
    nextTick(() => categoryGridRef.value?.setTreeExpand(row, true))
  }
}

const clearDetails = () => {
  selectedCategoryId.value = undefined
  selectedCategory.value = undefined
  tableData.value = []
  detailGridOptions.data = []
}

const loadCategoryList = async (id: number) => {
  categoryLoading.value = true
  try {
    const { data } = await fetchCategories(id)
    categoryGridOptions.data = data
    await expandCategoryTree()
  } catch {
    categoryGridOptions.data = []
    ElMessage.error('加载分类失败')
  } finally {
    categoryLoading.value = false
  }
}

const onVersionChange = (id: number) => {
  clearDetails()
  loadCategoryList(id)
}

const loadVersionList = async (keepVersionId?: number) => {
  versionLoading.value = true
  try {
    const { data } = await fetchVersions()
    versionList.value = data

    if (data.length === 0) {
      versionId.value = undefined
      categoryGridOptions.data = []
      clearDetails()
      return
    }

    const nextId =
      keepVersionId && data.some((item) => item.id === keepVersionId)
        ? keepVersionId
        : data[0].id

    versionId.value = nextId
    clearDetails()
    await loadCategoryList(nextId)
  } catch {
    versionList.value = []
    categoryGridOptions.data = []
    clearDetails()
    ElMessage.error('加载版本失败')
  } finally {
    versionLoading.value = false
  }
}

const onVersionDialogChanged = async () => {
  await loadVersionList(versionId.value)
}

const insertCategoryRow = async (parentId: number) => {
  if (!versionId.value) return

  const newRow: Category = {
    id: -Date.now(),
    code: '',
    name: '',
    remark: '',
    parentId,
    status: '启用',
    order: 9999,
    _isNew: true,
  }

  categoryGridOptions.data = [...categoryList.value, newRow]
  await expandCategoryTree()
  await categoryGridRef.value?.setCurrentRow(newRow)
  selectedCategory.value = newRow
  selectedCategoryId.value = undefined
  clearDetails()
  await categoryGridRef.value?.setEditCell(newRow, 'code')
}

const addCategoryRow = async () => {
  const root = getRootCategory(categoryList.value)
  if (!root) {
    ElMessage.error('未找到根分类')
    return
  }
  await insertCategoryRow(root.id)
}

const addSubCategoryRow = async () => {
  if (!selectedCategory.value || isRootCategory(selectedCategory.value)) return
  await insertCategoryRow(selectedCategory.value.id)
}

const isCategoryRowEmpty = (row: Category) =>
  !row.code?.trim() && !row.name?.trim() && !row.remark?.trim()

const canSaveNewCategory = (row: Category) =>
  !!row.code?.trim() && !!row.name?.trim()

const removePendingCategoryRow = (row: Category) => {
  categoryGridOptions.data = categoryList.value.filter((item) => item.id !== row.id)
  if (selectedCategoryId.value === row.id) {
    selectedCategory.value = undefined
    selectedCategoryId.value = undefined
    clearDetails()
  }
}

const validateCategoryRow = (row: Category) => {
  if (!row.code?.trim()) {
    ElMessage.error('编码不能为空')
    return false
  }
  if (!row.name?.trim()) {
    ElMessage.error('名称不能为空')
    return false
  }
  return true
}

const saveNewCategory = async (row: Category) => {
  if (!versionId.value || row.parentId == null) return

  const { data } = await createCategory({
    versionId: versionId.value,
    parentId: row.parentId,
    code: row.code.trim(),
    name: row.name.trim(),
    remark: row.remark?.trim() ?? '',
  })
  Object.assign(row, data, { _isNew: false })
  await loadCategoryList(versionId.value)
  const saved = categoryList.value.find((item) => item.id === data.id)
  if (saved) {
    await categoryGridRef.value?.setCurrentRow(saved)
    selectedCategory.value = saved
    selectedCategoryId.value = saved.id
    await loadDetailList(saved.id)
  }
}

const onCategoryEditClosed = async (params: any) => {
  const { row } = params as { row: Category }
  if (isRootCategory(row)) return

  if (row._isNew) {
    if (isCategoryRowEmpty(row)) {
      removePendingCategoryRow(row)
      return
    }
    if (!canSaveNewCategory(row)) {
      return
    }

    try {
      await saveNewCategory(row)
    } catch {
      ElMessage.error('保存分类失败')
    }
    return
  }

  if (!validateCategoryRow(row)) return

  try {
    const { data } = await updateCategory(row.id, {
      code: row.code.trim(),
      name: row.name.trim(),
      remark: row.remark?.trim() ?? '',
    })
    Object.assign(row, data)
  } catch {
    ElMessage.error('保存分类失败')
  }
}

const refreshAfterCategoryAction = async () => {
  if (!versionId.value) return
  const currentId = selectedCategoryId.value
  await loadCategoryList(versionId.value)
  if (currentId != null && currentId > 0) {
    const row = categoryList.value.find((item) => item.id === currentId)
    if (row) {
      await categoryGridRef.value?.setCurrentRow(row)
      selectedCategory.value = row
      selectedCategoryId.value = row.id
    }
    await loadDetailList(currentId)
  }
}

const updateMenuDisabled = (
  options: unknown,
  code: string,
  disabled: boolean,
) => {
  if (!Array.isArray(options)) return

  const groups = Array.isArray(options[0]) ? options : [options]

  for (const group of groups) {
    if (!Array.isArray(group)) continue
    const item = group.find(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        (entry as { code?: string }).code === code,
    ) as { disabled?: boolean } | undefined
    if (item) {
      item.disabled = disabled
    }
  }
}

const onCategoryCellMenu = (params: any) => {
  const row = params?.row as Category | undefined
  const options = params?.$menu?.options ?? params?.options
  if (!row || isRootCategory(row) || !options) return

  updateMenuDisabled(options, 'moveUp', !canMoveUp(categoryList.value, row))
  updateMenuDisabled(options, 'moveDown', !canMoveDown(categoryList.value, row))
  updateMenuDisabled(options, 'discard', row.status !== '启用')
  updateMenuDisabled(options, 'enable', row.status !== '废弃')
}

const handleCategoryMove = async (direction: 'up' | 'down', row = selectedCategory.value) => {
  if (!row || isRootCategory(row)) return

  if (direction === 'up' && !canMoveUp(categoryList.value, row)) {
    ElMessage.warning('已经在最上方')
    return
  }
  if (direction === 'down' && !canMoveDown(categoryList.value, row)) {
    ElMessage.warning('已经在最下方')
    return
  }

  try {
    const { data } = await moveCategory(row.id, direction)
    categoryGridOptions.data = data
    await expandCategoryTree()

    const current = data.find((item) => item.id === row.id)
    if (current) {
      await categoryGridRef.value?.setCurrentRow(current)
      selectedCategory.value = current
      selectedCategoryId.value = current.id
      await loadDetailList(current.id)
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  }
}

const onCategoryMenuClick = async (params: any) => {
  const { menu, row } = params as { menu: { code?: string }; row: Category }
  if (!row || isRootCategory(row) || !menu.code) return

  try {
    if (menu.code === 'delete') {
      await ElMessageBox.confirm('确定删除该数据？', '提示', { type: 'warning' })
      await deleteCategory(row.id)
      ElMessage.success('删除成功')
      if (selectedCategoryId.value === row.id) clearDetails()
      await refreshAfterCategoryAction()
      return
    }

    if (menu.code === 'moveUp') {
      await handleCategoryMove('up', row)
      return
    }

    if (menu.code === 'moveDown') {
      await handleCategoryMove('down', row)
      return
    }

    if (menu.code === 'discard' && row.status === '启用') {
      await discardCategory(row.id)
      await refreshAfterCategoryAction()
      return
    }

    if (menu.code === 'enable' && row.status === '废弃') {
      await enableCategory(row.id)
      await refreshAfterCategoryAction()
    }
  } catch (error) {
    if (!isUserCancel(error)) {
      ElMessage.error(getErrorMessage(error))
    }
  }
}

const addDetailRow = async () => {
  if (!canAddDetail.value || !selectedCategoryId.value) return

  const newRow: Detail = {
    id: -Date.now(),
    code: '',
    name: '',
    content: '',
    material: '',
    rule: '',
    unit: '',
    status: '启用',
    order: 9999,
    _isNew: true,
  }

  tableData.value = [...tableData.value, newRow]
  detailGridOptions.data = filteredDetailList.value
  await detailGridRef.value?.setCurrentRow(newRow)
  await detailGridRef.value?.setEditCell(newRow, 'code')
}

const onDetailCellMenu = (params: any) => {
  const row = params?.row as Detail | undefined
  const options = params?.$menu?.options ?? params?.options
  if (!row || !options) return

  updateMenuDisabled(options, 'moveUp', row._isNew || !canMoveDetailUp(tableData.value, row))
  updateMenuDisabled(options, 'moveDown', row._isNew || !canMoveDetailDown(tableData.value, row))
  updateMenuDisabled(options, 'discard', row._isNew || row.status !== '启用')
  updateMenuDisabled(options, 'enable', row._isNew || row.status !== '废弃')
}

const isDetailRowEmpty = (row: Detail) =>
  !row.code?.trim() &&
  !row.name?.trim() &&
  !row.content?.trim() &&
  !row.material?.trim() &&
  !row.rule?.trim() &&
  !row.unit?.trim()

const canSaveNewDetail = (row: Detail) =>
  !!row.code?.trim() && !!row.name?.trim() && !!row.unit?.trim()

const removePendingDetailRow = (row: Detail) => {
  tableData.value = tableData.value.filter((item) => item.id !== row.id)
  detailGridOptions.data = filteredDetailList.value
}

const validateDetailRow = (row: Detail) => {
  if (!row.code?.trim()) {
    ElMessage.error('编码不能为空')
    return false
  }
  if (!row.name?.trim()) {
    ElMessage.error('项目名称不能为空')
    return false
  }
  if (!row.unit?.trim()) {
    ElMessage.error('计量单位不能为空')
    return false
  }
  return true
}

const onDetailEditClosed = async (params: any) => {
  const { row } = params as { row: Detail }

  if (row._isNew) {
    if (isDetailRowEmpty(row)) {
      removePendingDetailRow(row)
      return
    }
    if (!canSaveNewDetail(row)) {
      return
    }

    try {
      if (!selectedCategoryId.value) return
      const { data } = await createDetail({
        categoryId: selectedCategoryId.value,
        code: row.code.trim(),
        name: row.name.trim(),
        content: row.content?.trim() ?? '',
        material: row.material?.trim() ?? '',
        rule: row.rule?.trim() ?? '',
        unit: row.unit.trim(),
      })
      Object.assign(row, data, { _isNew: false })
      await loadDetailList(selectedCategoryId.value)
    } catch {
      ElMessage.error('保存明细失败')
    }
    return
  }

  if (!validateDetailRow(row)) return

  try {
    const { data } = await updateDetail(row.id, {
      code: row.code.trim(),
      name: row.name.trim(),
      content: row.content?.trim() ?? '',
      material: row.material?.trim() ?? '',
      rule: row.rule?.trim() ?? '',
      unit: row.unit.trim(),
    })
    Object.assign(row, data)
    detailGridOptions.data = filteredDetailList.value
  } catch {
    ElMessage.error('保存明细失败')
  }
}

const onDetailMenuClick = async (params: any) => {
  const { menu, row } = params as { menu: { code?: string }; row: Detail }
  if (!row || !selectedCategoryId.value || !menu.code) return

  try {
    if (menu.code === 'delete') {
      if (row._isNew) {
        tableData.value = tableData.value.filter((item) => item.id !== row.id)
        detailGridOptions.data = filteredDetailList.value
        return
      }
      await deleteDetail(row.id)
      ElMessage.success('删除成功')
      await loadDetailList(selectedCategoryId.value)
      return
    }

    if (menu.code === 'moveUp') {
      if (row._isNew || !canMoveDetailUp(tableData.value, row)) return
      await moveDetail(row.id, 'up')
      await loadDetailList(selectedCategoryId.value)
      return
    }

    if (menu.code === 'moveDown') {
      if (row._isNew || !canMoveDetailDown(tableData.value, row)) return
      await moveDetail(row.id, 'down')
      await loadDetailList(selectedCategoryId.value)
      return
    }

    if (menu.code === 'discard' && row.status === '启用' && !row._isNew) {
      await discardDetail(row.id)
      await loadDetailList(selectedCategoryId.value)
      return
    }

    if (menu.code === 'enable' && row.status === '废弃' && !row._isNew) {
      await enableDetail(row.id)
      await loadDetailList(selectedCategoryId.value)
    }
  } catch (error) {
    if (!isUserCancel(error)) {
      ElMessage.error(getErrorMessage(error))
    }
  }
}

onMounted(() => {
  loadVersionList()
})
</script>

<style scoped>
.page {
  display: flex;
  height: 100vh;
}

.left {
  width: 320px;
  border-right: 1px solid #ddd;
  padding: 10px;
}

.version-bar,
.category-actions,
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.right {
  flex: 1;
  padding: 10px;
}

.toolbar {
  justify-content: space-between;
}

:deep(.row-disabled) {
  color: #999;
}

:deep(.category-root-row .vxe-cell--tree-btn) {
  display: none;
  pointer-events: none;
}
</style>
