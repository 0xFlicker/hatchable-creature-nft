import styles from "./ConnectWallet.module.css";
import Image from "next/image";
import connectIcon from "../public/assets/ConnectIcon.png";
import useAxolotlValleyERC721 from "../hooks/useCreatureERC721";

export default function () {
  const { connect } = useAxolotlValleyERC721();

  return (
    <button className={styles.connect_button} onClick={connect}>
      <Image src={connectIcon} alt="Connect Metamask" />
    </button>
  );
}
