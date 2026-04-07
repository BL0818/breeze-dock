//! 托盘图标资源
//!
//! 提供跨平台的托盘图标

#[cfg(feature = "tray-icon")]
use tauri::image::Image;

/// 默认 32x32 透明图标（static 生命周期）- RGBA 格式
#[cfg(feature = "tray-icon")]
static DEFAULT_ICON: &[u8] = &[0u8; 32 * 32 * 4]; // 全透明

/// 获取托盘图标（返回 RGBA 原始像素数据）
#[cfg(feature = "tray-icon")]
pub fn get_tray_icon() -> Image<'static> {
    // Image::new takes (bytes: &[u8], width, height)
    Image::new(DEFAULT_ICON, 32, 32)
}

/// tray-icon 功能未启用时的空实现
#[cfg(not(feature = "tray-icon"))]
pub fn get_tray_icon() {
    // tray-icon 功能未启用
}
