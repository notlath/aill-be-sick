type SHAPTextProps = {
  token: string;
  importance: number;
};

const SHAPText = ({ token, importance }: SHAPTextProps) => {
  return <span>{token}</span>;
};

export default SHAPText;
