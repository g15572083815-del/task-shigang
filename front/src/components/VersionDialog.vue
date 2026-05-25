<template>
  <el-dialog
    v-model="visible"
    title="维护版本"
    width="520px"
    destroy-on-close
    @open="loadVersions"
  >
    <div class="toolbar">
      <el-button type="primary" size="small" @click="addVersionRow">新增</el-button>
      <el-button size="small" :disabled="!selectedRow" @click="confirmDelete">删除</el-button>
      <el-button size="small" :disabled="!selectedRow" @click="toggleSelected">
        {{ toggleButtonText }}
      </el-button>
    </div>

    <vxe-grid
      ref="gridRef"
      v-bind="gridOptions"
      v-loading="loading"
      @current-change="onCurrentChange"
      @edit-closed="onEditClosed"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { VxeGridInstance, VxeGridProps } from 'vxe-table'
import {
  createVersion,
  deleteVersion,
  fetchVersions,
  toggleVersion,
  updateVersion,
} from '../api/version'
import type { Version } from '../types'
import { getErrorMessage, isUserCancel } from '../utils/error'

const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ changed: [] }>()

const gridRef = ref<VxeGridInstance>()
const loading = ref(false)
const selectedRow = ref<Version>()

const gridOptions = reactive<VxeGridProps<Version>>({
  border: true,
  size: 'small',
  height: 320,
  rowConfig: { isCurrent: true, isHover: true },
  editConfig: { trigger: 'dblclick', mode: 'cell' },
  columns: [
    {
      field: 'name',
      title: '名称',
      minWidth: 260,
      editRender: { name: 'input' },
    },
    {
      field: 'enabled',
      title: '状态',
      width: 100,
      formatter: ({ cellValue }) => (cellValue ? '启用' : '停用'),
    },
  ],
  data: [],
})

const toggleButtonText = computed(() => {
  if (!selectedRow.value) return '启用/停用'
  return selectedRow.value.enabled ? '停用' : '启用'
})

const loadVersions = async () => {
  loading.value = true
  try {
    const { data } = await fetchVersions()
    gridOptions.data = data
    selectedRow.value = undefined
  } catch {
    gridOptions.data = []
    ElMessage.error('加载版本失败')
  } finally {
    loading.value = false
  }
}

const onCurrentChange = ({ row }: { row?: Version }) => {
  selectedRow.value = row
}

const addVersionRow = async () => {
  const list = (gridOptions.data ?? []) as Version[]
  const newRow: Version = {
    id: -Date.now(),
    name: '',
    enabled: true,
    _isNew: true,
  }
  gridOptions.data = [...list, newRow]
  await gridRef.value?.setCurrentRow(newRow)
  selectedRow.value = newRow
  await gridRef.value?.setEditCell(newRow, 'name')
}

const removePendingVersionRow = (row: Version) => {
  gridOptions.data = ((gridOptions.data ?? []) as Version[]).filter(
    (item) => item.id !== row.id,
  )
  if (selectedRow.value?.id === row.id) {
    selectedRow.value = undefined
  }
}

const onEditClosed = async ({ row }: { row: Version }) => {
  if (row._isNew) {
    if (!row.name?.trim()) {
      removePendingVersionRow(row)
      return
    }

    try {
      const { data } = await createVersion(row.name.trim())
      Object.assign(row, data, { _isNew: false })
      emit('changed')
    } catch {
      ElMessage.error('保存版本失败')
    }
    return
  }

  const name = row.name?.trim()
  if (!name) {
    ElMessage.error('名称不能为空')
    return
  }

  try {
    const { data } = await updateVersion(row.id, name)
    Object.assign(row, data)
    emit('changed')
  } catch {
    ElMessage.error('保存版本失败')
  }
}

const confirmDelete = async () => {
  if (!selectedRow.value || selectedRow.value._isNew) return

  try {
    await ElMessageBox.confirm('确定删除该数据？', '提示', { type: 'warning' })
    await deleteVersion(selectedRow.value.id)
    ElMessage.success('删除成功')
    await loadVersions()
    emit('changed')
  } catch (error) {
    if (!isUserCancel(error)) {
      ElMessage.error(getErrorMessage(error, '删除失败'))
    }
  }
}

const toggleSelected = async () => {
  if (!selectedRow.value || selectedRow.value._isNew) return

  try {
    const { data } = await toggleVersion(selectedRow.value.id)
    Object.assign(selectedRow.value, data)
    emit('changed')
  } catch {
    ElMessage.error('更新状态失败')
  }
}
</script>

<script lang="ts">
export default {
  name: 'VersionDialog',
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
</style>
