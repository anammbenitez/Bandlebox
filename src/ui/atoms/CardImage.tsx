// Card art, requested the one way card-image.ts decides: the role picks the
// variant and size, and the smaller variants ride along as `data-fallback`
// for the page's image-fallback behavior (design D4). Never hard-code a size
// or a fallback at a call site.
import type { ImgHTMLAttributes } from 'react';
import { imgAttrs, type ImageRole } from '../../domain/card-image.ts';

export interface CardImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'alt'> {
	imageId: string;
	role: ImageRole;
	alt: string;
	/** Battlefield art: landscape dimensions. */
	rotate?: boolean;
}

export function CardImage({ imageId, role, alt, rotate = false, ...rest }: CardImageProps) {
	const attrs = imgAttrs(imageId, role, { rotate });
	return <img src={attrs.src} width={attrs.width} height={attrs.height} alt={alt} data-fallback={attrs.fallback} {...rest} />;
}
