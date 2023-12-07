import React, { FC } from "react";
import styles from "./imageList.module.scss";

interface ImageListProps {
  images?: string[];
}
const ImageList: FC<ImageListProps> = ({ images }) => {
  const singleImage = images && images.length === 1;

  return (
    <div className={singleImage ? styles.imageGridSingle : styles.imageGrid}>
      {images &&
        images.map((image, index) => (
          <img key={index} src={image} alt={`Image ${index}`} />
        ))}
    </div>
  );
};
export default ImageList;
