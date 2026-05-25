<template>
  <div class="page">

    <!-- 左侧 -->
    <div class="left">

      <div class="version-bar">
        <el-button type="primary" size="small">维护版本</el-button>

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
        <el-button size="small">新增分类</el-button>
        <el-button size="small">新增下级分类</el-button>
      </div>

      <vxe-grid
        v-bind="categoryGridOptions"
        v-loading="categoryLoading"
        @current-change="onCategorySelect"
      />

    </div>

    <!-- 右侧 -->
    <div class="right">

      <div class="toolbar">
        <el-button type="primary" size="small">新增明细</el-button>
        <el-input
          v-model="keyword"
          placeholder="搜索"
          size="small"
          style="width: 200px"
        />
      </div>

      <vxe-table
        v-loading="detailLoading"
        border
        height="500"
        :data="tableData"
        :row-class-name="detailRowClassName"
      >
        <vxe-column field="code" title="编码" width="100" />
        <vxe-column field="name" title="项目名称" />
        <vxe-column field="content" title="工作内容" />
        <vxe-column field="material" title="乙方承担材料" />
        <vxe-column field="rule" title="计算规则" />
        <vxe-column field="unit" title="计量单位" width="100" />
      </vxe-table>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { VxeGridProps } from 'vxe-table'
import { fetchDetails } from '../api/detail'
import { fetchCategories, fetchVersions } from '../api/version'
import type { Category, Detail, Version } from '../types'

const versionId = ref<number>()
const keyword = ref('')
const versionLoading = ref(false)
const categoryLoading = ref(false)
const detailLoading = ref(false)
const selectedCategoryId = ref<number>()

const versionList = ref<Version[]>([])
const tableData = ref<Detail[]>([])

const categoryGridOptions = reactive<VxeGridProps<Category>>({
  border: true,
  size: 'small',
  height: 400,
  rowConfig: {
    isCurrent: true,
    isHover: true,
  },
  treeConfig: {
    transform: true,
    rowField: 'id',
    parentField: 'parentId',
    expandAll: true,
  },
  rowClassName: ({ row }) => (row.status === '废弃' ? 'row-disabled' : ''),
  columns: [
    { field: 'code', title: '编码', width: 100, treeNode: true },
    { field: 'name', title: '名称', minWidth: 120 },
    { field: 'remark', title: '备注', minWidth: 100 },
  ],
  data: [],
})

const formatVersionLabel = (item: Version) => {
  return item.enabled ? item.name : `${item.name}（未启用）`
}

const detailRowClassName = ({ row }: { row: Detail }) => {
  return row.status === '废弃' ? 'row-disabled' : ''
}

const loadDetailList = async (categoryId: number) => {
  detailLoading.value = true
  try {
    const { data } = await fetchDetails(categoryId)
    tableData.value = data
  } catch {
    tableData.value = []
    ElMessage.error('加载明细失败')
  } finally {
    detailLoading.value = false
  }
}

const onCategorySelect = ({ row }: { row?: Category }) => {
  if (!row) {
    selectedCategoryId.value = undefined
    tableData.value = []
    return
  }

  selectedCategoryId.value = row.id
  loadDetailList(row.id)
}

const clearDetails = () => {
  selectedCategoryId.value = undefined
  tableData.value = []
}

const loadCategoryList = async (id: number) => {
  categoryLoading.value = true
  try {
    const { data } = await fetchCategories(id)
    categoryGridOptions.data = data
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

const loadVersionList = async () => {
  versionLoading.value = true
  try {
    const { data } = await fetchVersions()
    versionList.value = data

    if (data.length > 0) {
      versionId.value = data[0].id
      clearDetails()
      await loadCategoryList(data[0].id)
    } else {
      versionId.value = undefined
      categoryGridOptions.data = []
      clearDetails()
    }
  } catch {
    versionList.value = []
    categoryGridOptions.data = []
    clearDetails()
    ElMessage.error('加载版本失败')
  } finally {
    versionLoading.value = false
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

.version-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.category-actions {
  margin-bottom: 10px;
}

.right {
  flex: 1;
  padding: 10px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

:deep(.row-disabled) {
  color: #999;
}
</style>
