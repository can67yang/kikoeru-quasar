<template>
  <div>
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>音声库来源</q-toolbar-title>
        <q-btn color="primary" icon="add" label="新增来源" @click="openForm(-1)" />
      </q-toolbar>

      <q-list separator>
        <q-item v-if="!config.rootFolders.length" class="text-grey">
          <q-item-section>
            还没有配置任何来源。点上方「新增来源」添加本地或 WebDAV 音声库。
          </q-item-section>
        </q-item>

        <q-item v-for="rootFolder, index in config.rootFolders" :key="index">
          <q-item-section avatar>
            <q-icon :color="rootFolder.type === 'webdav' ? 'primary' : 'amber'" :name="rootFolder.type === 'webdav' ? 'cloud' : 'folder'" />
          </q-item-section>

          <q-item-section>
            <q-item-label>
              {{rootFolder.name}}
              <q-chip dense size="sm" :color="rootFolder.type === 'webdav' ? 'primary' : 'teal'" text-color="white">
                {{ rootFolder.type === 'webdav' ? 'WebDAV' : '本地' }}
              </q-chip>
            </q-item-label>
            <q-item-label caption lines="3">
              路径: {{rootFolder.path}}
              <template v-if="rootFolder.type === 'webdav'">
                <br>服务器: {{rootFolder.url}}
                <br v-if="rootFolder.username">用户名: {{rootFolder.username}}
                <template v-if="rootFolder.insecure"> · 跳过 TLS 校验</template>
              </template>
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="row q-gutter-x-xs">
              <q-btn v-if="rootFolder.type === 'webdav'" flat round dense color="primary" icon="wifi_tethering" @click="testConnection(rootFolder)" >
                <q-tooltip>测试连接</q-tooltip>
              </q-btn>
              <q-btn flat round dense color="primary" icon="edit" @click="openForm(index)">
                <q-tooltip>编辑</q-tooltip>
              </q-btn>
              <q-btn flat round dense color="red" icon="delete" @click="removeFromRootFolders(index)" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-dialog v-model="showForm">
      <q-card style="min-width: 480px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingIndex >= 0 ? `编辑来源: ${form.name}` : '新增来源' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-input
            class="q-mb-md"
            outlined dense
            v-model="form.name"
            label="别名 *"
            :rules="[val => !!val || '请输入来源别名', validateName]"
          />

          <q-select
            class="q-mb-md"
            outlined dense
            v-model="form.type"
            :options="typeOptions"
            label="类型"
            emit-value
            map-options
            :disable="editingIndex >= 0"
          />

          <template v-if="form.type === 'local'">
            <q-input class="q-mb-md" outlined dense v-model="form.path" label="绝对路径 *" :rules="[val => !!val || '请输入路径']" />
          </template>

          <template v-else>
            <q-input class="q-mb-md" outlined dense v-model="form.path" label="路径(音声作品所在子目录) *" />
            <q-input class="q-mb-md" outlined dense v-model="form.url" label="服务器地址 *"
              :rules="[val => !!val || '请输入 WebDAV 服务器地址', val => /^https?:\/\//i.test(val) || '服务器地址需以 http:// 或 https:// 开头']"
            />
            <q-input class="q-mb-md" outlined dense v-model="form.username" label="用户名" autocomplete="username" />
            <q-input class="q-mb-md" outlined dense v-model="form.password" label="密码" type="password" autocomplete="new-password" />
            <q-toggle class="q-mt-xs" v-model="form.insecure" label="跳过 TLS 证书校验(家庭自建 HTTPS 证书)" />
          </template>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn v-if="form.type === 'webdav'" flat label="测试连接" color="primary" :loading="testing" @click="onTestForm" />
          <q-btn flat label="保存" color="primary" @click="onSubmitForm" />
        </q-card-actions>

        <q-card-section v-if="testResult.show">
          <q-banner :class="testResult.ok ? 'text-positive bg-green-1' : 'text-negative bg-red-1'" dense>
            {{ testResult.message }}
          </q-banner>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-form @submit="onSubmit">
      <q-card class="q-ma-md">
        <q-toolbar>
          <q-toolbar-title>全局设置</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-input
            outlined dense
            type="number"
            v-model.number="config.webdavCacheSizeMB"
            label="WebDAV 物化缓存上限(MB)"
            :rules="[val => val >= 16 || '最小 16']"
          />
        </div>
      </q-card>

      <q-card class="q-ma-md" v-show="config.rootFolders.length">
        <q-toolbar>
          <q-toolbar-title>封面文件夹路径</q-toolbar-title>
        </q-toolbar>

        <div v-if="config.coverUseDefaultPath" class="q-pa-md">已指定为默认路径，即程序所在位置下的covers文件夹。如需修改，请前往高级设置并取消“封面使用默认路径”。</div>
        <q-input v-else outlined dense required v-model="config.coverFolderDir" class="q-pa-sm" />
      </q-card>

      <q-card class="q-ma-md">
        <q-toolbar>
          <q-toolbar-title>说明</q-toolbar-title>
        </q-toolbar>
        <q-card-section class="text-grey q-gutter-y-sm">
          <div>· WebDAV 来源为<b>只读</b>:文件管理、保存歌词、GBK 修复、站间同步会返回 403;封面下载与自定义元数据存本地,不受影响。</div>
          <div>· 修改<b>已生效</b>来源的服务器地址或账号密码需要<b>重启进程</b>;新增来源保存后重扫音声库即可。</div>
          <div>· 扫描/播放/下载走 Range 直连上游,本地磁盘零占用;仅转码、响度、时长兜底探测会用到上面的物化缓存。</div>
        </q-card-section>
      </q-card>

      <div class="q-ma-lg row justify-end">
        <q-btn :loading="loading" label="保存" type="submit" color="primary" />
      </div>
    </q-form>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

function emptyForm () {
  return {
    name: '',
    type: 'webdav',
    path: '',
    url: '',
    username: '',
    password: '',
    insecure: false
  }
}

export default {
  name: 'Folders',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {
        rootFolders: []
      },
      loading: false,
      showForm: false,
      editingIndex: -1,
      form: emptyForm(),
      testing: false,
      testResult: {
        show: false,
        ok: false,
        message: ''
      },
      typeOptions: [
        { label: 'WebDAV', value: 'webdav' },
        { label: '本地文件夹', value: 'local' }
      ]
    }
  },

  methods: {
    requestConfig () {
      this.$axios.get('/api/config/admin')
        .then((response) => {
          this.config = response.data.config
          if (!Array.isArray(this.config.rootFolders)) {
            this.config.rootFolders = []
          }
          if (this.config.webdavCacheSizeMB == null) {
            this.config.webdavCacheSizeMB = 1024
          }
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    onSubmit () {
      this.loading = true
      this.$axios.put('/api/config/admin', {
        config: this.config
      })
        .then((response) => {
          this.showSuccNotif(response.data.message)
          this.loading = false
        })
        .catch((error) => {
          this.loading = false
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    openForm (index) {
      this.editingIndex = index
      if (index >= 0) {
        this.form = Object.assign(emptyForm(), this.config.rootFolders[index])
      } else {
        this.form = emptyForm()
      }
      this.testResult.show = false
      this.showForm = true
    },

    validateName (val) {
      if (this.config.rootFolders.some((rootFolder, i) => i !== this.editingIndex && rootFolder.name === val)) {
        return `别名 "${val}" 已存在`
      }
      return true
    },

    validateForm (form) {
      if (!form.name) return '请输入来源别名。'
      if (this.config.rootFolders.some((rootFolder, i) => i !== this.editingIndex && rootFolder.name === form.name)) {
        return `别名 "${form.name}" 已存在。`
      }
      if (!form.path) return '请输入路径。'
      if (form.type === 'webdav') {
        if (!form.url) return '请输入 WebDAV 服务器地址。'
        if (!/^https?:\/\//i.test(form.url)) return '服务器地址需以 http:// 或 https:// 开头。'
      }
      return ''
    },

    formValues () {
      const form = {
        name: (this.form.name || '').trim(),
        type: this.form.type
      }
      if (this.form.type === 'webdav') {
        form.path = (this.form.path || '').trim()
        form.url = (this.form.url || '').trim()
        form.username = (this.form.username || '').trim()
        form.password = this.form.password || ''
        form.insecure = !!this.form.insecure
      } else {
        form.path = (this.form.path || '').trim()
      }
      return form
    },

    onSubmitForm () {
      const form = this.formValues()
      const error = this.validateForm(form)
      if (error) {
        this.showErrNotif(error)
        return
      }
      if (this.editingIndex >= 0) {
        this.config.rootFolders.splice(this.editingIndex, 1, form)
      } else {
        this.config.rootFolders.push(form)
      }
      this.showForm = false
      this.onSubmit()
    },

    removeFromRootFolders (index) {
      const folder = this.config.rootFolders[index]
      this.$q.dialog({
        title: '删除来源',
        message: `确定删除来源 "${folder.name}"?仅移除配置,不删除服务器上的文件。`,
        ok: { label: '删除', color: 'negative' },
        cancel: { label: '取消', color: 'secondary' }
      }).onOk(() => {
        this.config.rootFolders.splice(index, 1)
        this.onSubmit()
        this.showSuccNotif('已删除来源')
      })
    },

    onTestForm () {
      const form = this.formValues()
      const error = this.validateForm(form)
      if (error) {
        this.showErrNotif(error)
        return
      }
      this.testConnection(form)
    },

    testConnection (folder) {
      this.testing = true
      this.testResult = { show: true, ok: false, message: '测试中…' }
      this.$axios.post('/api/config/admin/test-webdav', {
        url: folder.url,
        username: folder.username,
        password: folder.password,
        insecure: folder.insecure,
        path: folder.path
      })
        .then((response) => {
          if (response.data.ok) {
            this.testResult = { show: true, ok: true, message: `连接成功,路径下共 ${response.data.entries} 个条目。` }
          } else {
            this.testResult = { show: true, ok: false, message: `连接失败: ${response.data.error || '未知错误'}` }
          }
        })
        .catch((error) => {
          this.testResult = { show: true, ok: false, message: `连接失败: ${error.message || error}` }
        })
        .finally(() => {
          this.testing = false
          if (!this.showForm) {
            // 从列表项直接测试时用通知展示结果
            this.testResult.ok
              ? this.showSuccNotif(this.testResult.message)
              : this.showErrNotif(this.testResult.message)
            this.testResult.show = false
          }
        })
    },
  },

  created () {
    this.requestConfig()
  }
}
</script>
