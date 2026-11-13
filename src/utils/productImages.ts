import heroSealImg from '../assets/images/hero_verification_seal_1794573872630.jpg';
import watchImg from '../assets/images/product_watch_chronograph_1794573874198.jpg';
import headphonesImg from '../assets/images/product_audio_headphones_1794573873631.jpg';
import serumImg from '../assets/images/product_skincare_serum_1794573874288.jpg';
import type { ProductImageKey } from './verification';

export const PRODUCT_IMAGE_MAP: Record<ProductImageKey, string> = {
  seal: heroSealImg,
  watch: watchImg,
  headphones: headphonesImg,
  serum: serumImg,
};

export function getProductImageSrc(key: ProductImageKey): string {
  return PRODUCT_IMAGE_MAP[key] || heroSealImg;
}
