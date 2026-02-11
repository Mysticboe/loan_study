import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 1. 确保引入了路由配置
import Vant from 'vant'
import 'vant/lib/index.css'
const app = createApp(App)
app.use(router) // 2. 核心：这一行必须有，否则所有的路由跳转和 router-view 都失效
app.use(Vant)
app.mount('#app')