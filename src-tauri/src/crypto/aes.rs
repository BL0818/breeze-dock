//! AES-256-GCM 加密模块
//!
//! 提供笔记内容的 AES-256-GCM 加密/解密功能

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

/// AES-256-GCM 加密/解密错误类型
#[derive(Debug, thiserror::Error)]
pub enum AesError {
    #[error("加密失败: {0}")]
    EncryptError(String),
    #[error("解密失败: {0}")]
    DecryptError(String),
    #[error("密钥错误: {0}")]
    KeyError(String),
    #[error("Base64 解码失败: {0}")]
    Base64Error(#[from] base64::DecodeError),
}

/// 密钥长度（AES-256 需要 32 字节密钥）
pub const KEY_SIZE: usize = 32;
/// Nonce 长度（AES-GCM 标准 12 字节）
pub const NONCE_SIZE: usize = 12;
/// 盐值长度（Argon2 使用的标准 16 字节）
pub const SALT_SIZE: usize = 16;

/// 加密笔记内容
///
/// 使用 AES-256-GCM 加密，返回格式：Base64(salt[16字节] + nonce[12字节] + ciphertext + tag)
///
/// # 参数
/// - `content`: 待加密的笔记内容
/// - `key`: 32 字节加密密钥
///
/// # 返回
/// Base64 编码的密文
pub fn encrypt_note_content(content: &str, key: &[u8]) -> Result<String, AesError> {
    if key.len() != KEY_SIZE {
        return Err(AesError::KeyError(format!(
            "密钥长度错误: 期望 {} 字节, 实际 {} 字节",
            KEY_SIZE,
            key.len()
        )));
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| AesError::EncryptError(format!("创建加密器失败: {}", e)))?;

    // 生成随机盐值（16 字节）
    use rand::RngCore;
    let mut salt = vec![0u8; SALT_SIZE];
    OsRng.fill_bytes(&mut salt);

    // 生成随机 nonce（12 字节）
    let mut nonce_bytes = [0u8; NONCE_SIZE];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // 加密
    let ciphertext = cipher
        .encrypt(nonce, content.as_bytes())
        .map_err(|e| AesError::EncryptError(format!("加密失败: {}", e)))?;

    // 将 salt + nonce + ciphertext 拼接后 Base64 编码
    let mut combined = Vec::with_capacity(SALT_SIZE + NONCE_SIZE + ciphertext.len());
    combined.extend_from_slice(&salt);
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&combined))
}

/// 解密笔记内容
///
/// 解密 Base64(salt + nonce + ciphertext) 格式的密文
///
/// # 参数
/// - `ciphertext_b64`: Base64 编码的密文
/// - `key`: 32 字节加密密钥
///
/// # 返回
/// 解密后的明文字符串
pub fn decrypt_note_content(ciphertext_b64: &str, key: &[u8]) -> Result<String, AesError> {
    if key.len() != KEY_SIZE {
        return Err(AesError::KeyError(format!(
            "密钥长度错误: 期望 {} 字节, 实际 {} 字节",
            KEY_SIZE,
            key.len()
        )));
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| AesError::DecryptError(format!("创建解密器失败: {}", e)))?;

    // Base64 解码
    let combined = BASE64.decode(ciphertext_b64)?;
    if combined.len() < SALT_SIZE + NONCE_SIZE {
        return Err(AesError::DecryptError("密文数据过短".to_string()));
    }

    // 分离 salt, nonce 和密文
    let (salt_and_rest, ciphertext) = combined.split_at(SALT_SIZE + NONCE_SIZE);
    let (salt, nonce_bytes) = salt_and_rest.split_at(SALT_SIZE);
    let nonce = Nonce::from_slice(nonce_bytes);

    // 解密
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| AesError::DecryptError(format!("解密失败: {}", e)))?;

    String::from_utf8(plaintext)
        .map_err(|e| AesError::DecryptError(format!("UTF-8 解码失败: {}", e)))
}

/// 批量加密笔记内容（标题和内容）
///
/// # 参数
/// - `title`: 笔记标题
/// - `content`: 笔记内容
/// - `key`: 32 字节加密密钥
///
/// # 返回
/// (加密标题, 加密内容, 盐值) 的 Base64 编码字符串元组
pub fn encrypt_note(title: &str, content: &str, key: &[u8]) -> Result<(String, String), AesError> {
    let encrypted_content = encrypt_note_content(content, key)?;
    let encrypted_title = encrypt_note_content(title, key)?;
    Ok((encrypted_title, encrypted_content))
}

/// 批量解密笔记内容（标题和内容）
///
/// # 参数
/// - `title_b64`: Base64 编码的加密标题
/// - `content_b64`: Base64 编码的加密内容
/// - `key`: 32 字节加密密钥
///
/// # 返回
/// (解密标题, 解密内容) 元组
pub fn decrypt_note(title_b64: &str, content_b64: &str, key: &[u8]) -> Result<(String, String), AesError> {
    let decrypted_title = decrypt_note_content(title_b64, key)?;
    let decrypted_content = decrypt_note_content(content_b64, key)?;
    Ok((decrypted_title, decrypted_content))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; KEY_SIZE] {
        [0u8; KEY_SIZE] // 全零密钥用于测试
    }

    #[test]
    fn test_encrypt_decrypt() {
        let key = test_key();
        let content = "这是一条测试笔记内容，包含中文和 English。";

        let encrypted = encrypt_note_content(content, &key).unwrap();
        let decrypted = decrypt_note_content(&encrypted, &key).unwrap();

        assert_eq!(decrypted, content);
    }

    #[test]
    fn test_encrypt_decrypt_empty() {
        let key = test_key();
        let content = "";

        let encrypted = encrypt_note_content(content, &key).unwrap();
        let decrypted = decrypt_note_content(&encrypted, &key).unwrap();

        assert_eq!(decrypted, content);
    }

    #[test]
    fn test_encrypt_note() {
        let key = test_key();
        let title = "测试标题";
        let content = "测试内容";

        let (enc_title, enc_content) = encrypt_note(title, content, &key).unwrap();
        let (dec_title, dec_content) = decrypt_note(&enc_title, &enc_content, &key).unwrap();

        assert_eq!(dec_title, title);
        assert_eq!(dec_content, content);
    }

    #[test]
    fn test_wrong_key_fails() {
        let key1 = [0u8; KEY_SIZE];
        let key2 = [1u8; KEY_SIZE];
        let content = "secret data";

        let encrypted = encrypt_note_content(content, &key1).unwrap();
        let result = decrypt_note_content(&encrypted, &key2);
        assert!(result.is_err());
    }

    #[test]
    fn test_different_salt_produces_different_ciphertext() {
        let key = test_key();
        let content = "same content";

        let encrypted1 = encrypt_note_content(content, &key).unwrap();
        let encrypted2 = encrypt_note_content(content, &key).unwrap();

        // 相同内容应产生不同密文（因为每次使用随机盐）
        assert_ne!(encrypted1, encrypted2);

        // 但都能正确解密
        assert_eq!(decrypt_note_content(&encrypted1, &key).unwrap(), content);
        assert_eq!(decrypt_note_content(&encrypted2, &key).unwrap(), content);
    }
}
