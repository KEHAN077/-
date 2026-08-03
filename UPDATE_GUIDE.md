# 作品集管理后台使用说明

部署本版本后，访问：

```text
https://kehan077.github.io/-/admin.html
```

即可在网页中编辑网站文字、新增或删除作品、调整顺序，并上传图片和视频。

## 首次登录

1. 登录 GitHub，打开 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**。
2. 新建一个 token，Repository access 只选择网站仓库 `kehan077/-`。
3. 在 Permissions 中将 **Contents** 设为 **Read and write**，其余权限不需要开启。
4. 生成后复制 token，粘贴到管理后台。token 只保存在当前浏览器标签页，关闭标签页后会清除。

默认仓库信息：

- GitHub 用户名：`kehan077`
- 仓库名：`-`
- 分支：`main`（如果仓库使用 `master`，请改为 `master`）

## 发布作品

1. 点击“新增作品”。
2. 填写标题、年份、分类等信息。
3. 上传图片或视频；支持 JPG、PNG、WebP、GIF、MP4 和 WebM。
4. 勾选“在网站发布”。
5. 点击右上角“保存并发布”。GitHub Pages 通常会在 1–3 分钟内更新。

## 媒体建议

- 图片优先使用 WebP 或压缩后的 JPG。
- 视频优先使用 H.264 编码的 MP4，建议 1080p 以下。
- 后台限制单文件最大 45 MB。更大的视频建议先压缩，或填写外部视频直链。
- 删除作品不会删除已经上传的媒体文件，避免误删仍被其他作品使用的文件。

## 安全提示

- 不要把 token 发给别人，也不要写进任何网站文件。
- 使用只授权 `kehan077/-` 仓库的 Fine-grained token。
- 如果怀疑 token 泄露，请立即在 GitHub 的 token 设置页面撤销它并重新创建。
