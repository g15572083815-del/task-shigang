import { createApp } from 'vue'
import App from './App.vue'

// element-plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// vxe-table
import 'vxe-table/lib/style.css'
import VXETable from 'vxe-table'

// router
import { router } from './router'

const app = createApp(App)

app.use(ElementPlus)
app.use(VXETable)
app.use(router)

app.mount('#app')