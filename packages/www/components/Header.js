import styles from "./Header.module.css";
import ConnectWallet from "./ConnectWallet";

export default function () {
  return (
    <div className={styles.header_bar}>
      This is a header bar
      <ConnectWallet />
    </div>
  );
}
