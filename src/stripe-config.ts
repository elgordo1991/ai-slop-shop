export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
}

export const products: Product[] = [
  {
    id: 'prod_Sbh9YkL7PeS0kd',
    priceId: 'price_1RgTl100QL3l2eWUTfMpkxVy',
    name: 't-shirt',
    description: 'AI Generated T-Shirt',
    mode: 'payment',
    price: 20,
  },
];

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};