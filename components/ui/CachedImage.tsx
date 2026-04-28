import { Image, ImageStyle } from 'expo-image';
import React from 'react';
import { StyleProp } from 'react-native';

interface CachedImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

const CachedImage: React.FC<CachedImageProps> = ({ uri, style, contentFit = 'cover' }) => (
  <Image
    source={{ uri }}
    style={style}
    contentFit={contentFit}
    cachePolicy="memory-disk"
    recyclingKey={uri}
  />
);

export default CachedImage;
