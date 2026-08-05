import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadResult {
  url: string;
  isBase64Fallback: boolean;
  error?: string;
}

/**
 * Helper to convert File to Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('파일 변환 오류'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Unified Upload Handler for Admin CMS & Settings
 * 
 * Includes:
 * 1. File type validation (JPG, PNG only)
 * 2. File size validation (Max 20MB)
 * 3. Upload timeout (15 seconds) to prevent infinite loading
 * 4. Error classification (403, 413, Timeout)
 * 5. Robust Base64 fallback in case Firebase Storage is unprovisioned, blocked by CORS, or unauthorized.
 */
export async function uploadImageWithFallback(
  file: File,
  storagePath: string,
  onProgressState?: (uploading: boolean) => void
): Promise<UploadResult> {
  if (onProgressState) onProgressState(true);

  // 1. File format validation
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedExtensions.includes(extension || '') || !allowedMimeTypes.includes(file.type)) {
    const errorMsg = '지원하지 않는 파일 형식입니다. JPG, PNG, WebP 형식의 이미지만 업로드 가능합니다.';
    if (onProgressState) onProgressState(false);
    return {
      url: '',
      isBase64Fallback: false,
      error: errorMsg
    };
  }

  // 2. File size validation (Max 20MB)
  if (file.size > 20 * 1024 * 1024) {
    const errorMsg = `서버 용량 제한 초과(413 Payload Too Large): 첨부 가능한 파일의 최대 크기는 20MB입니다. 현재 파일 크기: ${(file.size / (1024 * 1024)).toFixed(2)}MB.`;
    if (onProgressState) onProgressState(false);
    return {
      url: '',
      isBase64Fallback: false,
      error: errorMsg
    };
  }

  // 3. Try Firebase Storage with Timeout
  const fileRef = ref(storage, storagePath);
  const uploadPromise = uploadBytes(fileRef, file).then(() => getDownloadURL(fileRef));

  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, 15000); // 15 seconds timeout
  });

  try {
    // Race between normal upload and 15s timeout
    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    if (onProgressState) onProgressState(false);
    return {
      url: downloadUrl,
      isBase64Fallback: false
    };
  } catch (err: any) {
    console.error('Firebase Storage upload failed, attempting Base64 fallback. Error details:', err);

    let classification = '네트워크 또는 스토리지 오류가 발생했습니다.';
    const errorStr = String(err?.message || err?.code || err);

    if (errorStr === 'TIMEOUT') {
      classification = '네트워크 업로드 타임아웃: 불안정한 네트워크 환경 또는 일시적인 응답 지연으로 인해 스토리지 업로드가 제한되었습니다.';
    } else if (
      errorStr.includes('storage/unauthorized') || 
      errorStr.includes('403') || 
      errorStr.includes('permission') ||
      errorStr.includes('Forbidden')
    ) {
      classification = '스토리지 권한 오류(403 Forbidden): Firebase Storage 업로드 권한 또는 보안 규칙(Security Rules) 설정을 확인해 주십시오.';
    } else if (errorStr.includes('413') || errorStr.includes('too large')) {
      classification = '서버 용량 제한 초과(413 Payload Too Large): 허용 가능한 데이터 크기를 초과하여 차단되었습니다.';
    } else {
      classification = `스토리지 연동 오류: ${errorStr}`;
    }

    try {
      // Convert to Base64 as robust fallback
      const base64Data = await fileToBase64(file);
      if (onProgressState) onProgressState(false);
      return {
        url: base64Data,
        isBase64Fallback: true,
        error: classification
      };
    } catch (fallbackErr) {
      if (onProgressState) onProgressState(false);
      return {
        url: '',
        isBase64Fallback: false,
        error: `${classification} (또한 Base64 인코딩 과정에서 실패하였습니다: ${fallbackErr instanceof Error ? fallbackErr.message : fallbackErr})`
      };
    }
  }
}
