//! 加密模块
//!
//! 提供 AES-256-GCM 加密/解密和 Argon2 密码推导功能

pub mod aes;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2, Params,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

/// 密码相关错误类型
#[derive(Debug, thiserror::Error)]
pub enum PasswordError {
    #[error("密码哈希失败: {0}")]
    HashError(String),
    #[error("密码验证失败: {0}")]
    VerifyError(String),
    #[error("密钥派生失败: {0}")]
    DeriveError(String),
}

/// 使用 Argon2id 哈希密码
///
/// # 参数
/// - `password`: 用户密码
///
/// # 返回
/// Base64 编码的密码哈希字符串
pub fn hash_password(password: &str) -> Result<String, PasswordError> {
    // 生成随机盐值（16 字节）
    let salt = SaltString::generate(&mut OsRng);

    // 使用 Argon2id 参数
    let argon2 = Argon2::default();

    // 哈希密码
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| PasswordError::HashError(format!("Argon2 哈希失败: {}", e)))?;

    Ok(hash.to_string())
}

/// 验证密码是否匹配哈希
///
/// # 参数
/// - `password`: 用户输入的密码
/// - `hash`: 存储的 Argon2 哈希字符串
///
/// # 返回
/// 密码是否匹配
pub fn verify_password(password: &str, hash: &str) -> Result<bool, PasswordError> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| PasswordError::VerifyError(format!("解析密码哈希失败: {}", e)))?;

    let argon2 = Argon2::default();
    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Argon2id 密钥派生
///
/// 从用户密码派生 256 位加密密钥
///
/// # 参数
/// - `password`: 用户密码
/// - `salt`: 16 字节盐值
///
/// # 返回
/// 32 字节（256 位）密钥
pub fn derive_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, PasswordError> {
    // 将盐值转换为 SaltString 格式
    let salt_b64 = BASE64.encode(salt);
    let salt_string = SaltString::from_b64(&salt_b64)
        .map_err(|e| PasswordError::DeriveError(format!("创建盐值失败: {}", e)))?;

    // Argon2id 参数：内存 64MB，迭代 3 次，并行度 4
    let params = Params::new(65536, 3, 4, Some(32))
        .map_err(|e| PasswordError::DeriveError(format!("创建 Argon2 参数失败: {}", e)))?;

    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

    // 派生密钥
    let key = argon2
        .hash_password(password.as_bytes(), &salt_string)
        .map_err(|e| PasswordError::DeriveError(format!("密钥派生失败: {}", e)))?;

    // 提取原始密钥字节
    let key_bytes = key
        .hash
        .ok_or_else(|| PasswordError::DeriveError("哈希结果为空".to_string()))?;

    Ok(key_bytes.as_bytes().to_vec())
}

/// 生成随机盐值
///
/// # 返回
/// 16 字节随机盐值（Base64 编码）
pub fn generate_salt() -> String {
    use rand::RngCore;
    let mut salt = vec![0u8; 16];
    OsRng.fill_bytes(&mut salt);
    BASE64.encode(&salt)
}

/// 从 Base64 盐值解码为原始字节
pub fn decode_salt(salt_b64: &str) -> Result<Vec<u8>, PasswordError> {
    BASE64.decode(salt_b64)
        .map_err(|e| PasswordError::DeriveError(format!("盐值 Base64 解码失败: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify() {
        let password = "test_password_123";
        let hash = hash_password(password).unwrap();
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_derive_key() {
        let password = "test_password";
        let salt = vec![0u8; 16]; // 全零盐值用于测试
        let key1 = derive_key(password, &salt).unwrap();
        let key2 = derive_key(password, &salt).unwrap();

        // 相同密码和盐应产生相同密钥
        assert_eq!(key1, key2);

        // 不同盐应产生不同密钥
        let salt2 = vec![1u8; 16];
        let key3 = derive_key(password, &salt2).unwrap();
        assert_ne!(key1, key3);

        // 密钥长度应为 32 字节
        assert_eq!(key1.len(), 32);
    }

    #[test]
    fn test_generate_salt() {
        let salt1 = generate_salt();
        let salt2 = generate_salt();
        assert_ne!(salt1, salt2);
        // Base64 编码的 16 字节应约为 24 字符
        assert!(salt1.len() >= 20);
    }
}
