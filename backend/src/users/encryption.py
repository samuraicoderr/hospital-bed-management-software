"""
    This module provides encryption and decryption functions using the AES algorithm.
    
    Quick Notes:
        - the preferred AES is AES-256, which implies the key must be 32 bytes (256 bits) long.
        - the preferred mode is GCM (Galois Counter Mode), this allows tamper detection, parallelism, and faster encryption.
        - nonce is used to randomize the cyphertext. if nonce A and nonce B are used to encrypt the same message, the resulting cyphertext will be different, hence a random nonce is used for each encryption.
        - tag is used to verify the cyphertext hasn't been tampered with.
        
    The hex for the cyphertext, tag and nonce are concatenated as follows:
        DATA:= ciphertext + tag + nonce
    
    Decryption:
        - to decrypt, the cyphertext, tag and nonce are separated.
        - the cyphertext is decrypted using the key and nonce.
        - the tag is verified to ensure the cyphertext hasn't been tampered with.
    
    NOTE:
        - if the nonce is tampered the correct cyphertext cannot be decrypted.
    
"""

import os
from Crypto.Cipher import AES
from typing import Union

AES_256_KEY_SIZE_IN_BYTES = 32  # 256 bits

# Please do not set the nonce size above 12 bytes, there's no real security gain and it incurs more processing
MAX_NONCE_SIZE_IN_BYTES = 12  # 96 bits
MAX_TAG_SIZE_IN_BYTES = 16


DEFAULT_NONCE = '10f3762e26bffdd98dd3af7e'


class SecurityError(Exception):
    pass

class InvalidCipherTextError(SecurityError):
    """Raised when the cyphertext usually to decrypt is invalid."""


def xor(a: bytes, b: bytes) -> bytes:
    if len(a) != len(b):
        raise ValueError("Input bytes must be of equal length")
    if not isinstance(a, bytes) or not isinstance(b, bytes):
        raise ValueError("Input bytes must be of type bytes")
    return bytes(x ^ y for x, y in zip(a, b))


def verify_AES_256_config(key: bytes, nonce_size: int, tag_size: int) -> bool:
    if not isinstance(key, bytes) or len(key) != AES_256_KEY_SIZE_IN_BYTES: 
        raise ValueError(f"Key must be bytes of length {AES_256_KEY_SIZE_IN_BYTES} bytes")
    
    if nonce_size > MAX_NONCE_SIZE_IN_BYTES:
        raise ValueError(f"Nonce size must be less than or equal to {MAX_NONCE_SIZE_IN_BYTES} bytes")

    if tag_size > MAX_TAG_SIZE_IN_BYTES:
        raise ValueError(f"Tag size must be less than or equal to {MAX_TAG_SIZE_IN_BYTES} bytes")


def encrypt(data: Union[str, bytes], key: bytes, nonce_size: int = MAX_NONCE_SIZE_IN_BYTES, tag_size: int = MAX_TAG_SIZE_IN_BYTES, use_default_nonce: bool = False, return_bytes: bool = False) -> str:
    """
        `use_default_nonce=True` ensures the cyphertext is the same every time, there are rare cases where this is desired.
    """
    verify_AES_256_config(key, nonce_size, tag_size)

    if isinstance(data, str):
        data = data.encode('utf-8')
    
    nonce = bytes.fromhex(DEFAULT_NONCE) if use_default_nonce else os.urandom(nonce_size)    # the nonce 
    
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce, mac_len=tag_size)
    ciphertext, tag = cipher.encrypt_and_digest(data)   # both are bytes
    
    if return_bytes:
        return ciphertext+tag+nonce
    
    chex, thex, nhex = ciphertext.hex(), tag.hex(), nonce.hex()    
    
    # return f"{chex}.{thex}.{nhex}" # had the temptation to put delimiters e.g '.' but that makes it obvious where the cyphertext, tag and nonce are.
    return f"{chex}{thex}{nhex}" 


def decrypt(data: Union[str, bytes], key: bytes, nonce_size: int = MAX_NONCE_SIZE_IN_BYTES, tag_size: int = MAX_TAG_SIZE_IN_BYTES, return_bytes: bool = False) -> str:
    verify_AES_256_config(key, nonce_size, tag_size)
    
    if isinstance(data, bytes):
        data = data.hex()
    
    ni = -nonce_size*2  # where nonce starts from the end
    ti = ni - tag_size*2    # where tag starts from the end
    chex, thex, nhex = data[:ti], data[ti:ni], data[ni:]
    
    try:
        ciphertext = bytes.fromhex(chex)
        tag = bytes.fromhex(thex)
        nonce = bytes.fromhex(nhex)
    except Exception as ex:
        raise InvalidCipherTextError("Invalid cyphertext") from ex
    
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    decipher = cipher.decrypt(ciphertext)
    
    if not return_bytes:
        decipher = decipher.decode(encoding='utf-8', errors='replace')
    
    try:
        cipher.verify(tag)
        is_tampered = False
    except Exception as ex:
        is_tampered = True
    
    return decipher, is_tampered


def bytes2hex(b):
    return b.hex()

def hex2bytes(h):
    return bytes.fromhex(h)