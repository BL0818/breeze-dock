# 阿里巴巴普惠体 (Alibaba PuHuiTi)

## 字体文件清单

请将以下字体文件放置在此目录：

```
public/fonts/Alibaba-PuHuiTi/
├── Alibaba-PuHuiTi-Light.woff2    (细体 300)
├── Alibaba-PuHuiTi-Light.woff
├── Alibaba-PuHuiTi-Regular.woff2  (常规 400)
├── Alibaba-PuHuiTi-Regular.woff
├── Alibaba-PuHuiTi-Medium.woff2   (中等 500)
├── Alibaba-PuHuiTi-Medium.woff
├── Alibaba-PuHuiTi-Bold.woff2     (粗体 700)
├── Alibaba-PuHuiTi-Bold.woff
├── Alibaba-PuHuiTi-Heavy.woff2    (特粗 900)
├── Alibaba-PuHuiTi-Heavy.woff
└── README.md (本文件)
```

## 下载地址

### 官方渠道
- **阿里巴巴字体官网**: https://www.alibabafonts.com/
- **GitHub 开源仓库**: https://github.com/alibaba/puhuiti

### 直接下载
访问 https://www.alibabafonts.com/#/font 选择 "阿里巴巴普惠体" 下载完整字体包。

## 字体规格

| 字重 | 文件名 | CSS weight |
|------|--------|-----------|
| Light | Alibaba-PuHuiTi-Light | 300 |
| Regular | Alibaba-PuHuiTi-Regular | 400 |
| Medium | Alibaba-PuHuiTi-Medium | 500 |
| Bold | Alibaba-PuHuiTi-Bold | 700 |
| Heavy | Alibaba-PuHuiTi-Heavy | 900 |

## 字体特性

- **风格**: 现代几何无衬线体
- **气质**: 温润柔和、专业亲和
- **适用**: 屏幕显示、长时间阅读
- **授权**: 免费商用，永久授权

## 字体回退栈

已配置的字体回退顺序：
```css
'Alibaba PuHuiTi',    /* 首选: 阿里巴巴普惠体 */
'PingFang SC',        /* macOS 苹方 */
'Microsoft YaHei',    /* Windows 微软雅黑 */
'Helvetica Neue',     /* macOS 西文 */
Arial,                /* Windows 西文 */
sans-serif            /* 通用回退 */
```

## 注意事项

1. 如只需部分字重，可只下载所需文件并删除 global.css 中对应的 @font-face
2. woff2 格式优先，如无可使用 woff 格式并修改 global.css 中的 src
3. 字体文件较大，建议启用 gzip/brotli 压缩传输
