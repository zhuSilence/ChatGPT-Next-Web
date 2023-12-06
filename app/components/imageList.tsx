import React, { FC } from "react";
import styles from "./imageList.module.scss";
import { Image } from "openai/src/resources/images";

interface ImageListProps {
  images?: Image[];
}
const ImageList: FC<ImageListProps> = ({ images }) => {
  const singleImage = images && images.length === 1;

  return (
    <div className={singleImage ? styles.imageGridSingle : styles.imageGrid}>
      {images &&
        images.map((image, index) => (
          <img key={index} src={image.url} alt={`Image ${index}`} />
        ))}
    </div>
  );
};
export default ImageList;
