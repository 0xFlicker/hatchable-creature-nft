import React, { FC } from "react";
import Image from "next/image";

import useCreatureMetadata from "../../hooks/useCreatureMetadata";

import styles from "./CreatureCard.module.css";

interface IProps {
  tokenId?: number;
}

const CreatureCard: FC<IProps> = ({ tokenId }) => {
  const { metadata, imgSrc, loaded, exists } = useCreatureMetadata(tokenId);

  return (
    <div className={styles.root}>
      {!loaded && <div className={styles.loading}>Loading...</div>}
      {loaded && !exists && <div className={styles.notFound}>Not Found</div>}
      {imgSrc && <Image src={imgSrc} width={569} height={569} />}
    </div>
  );
};

export default CreatureCard;
