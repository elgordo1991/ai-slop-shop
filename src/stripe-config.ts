export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  color: 'black' | 'white';
  image: string;
  sizes: string[];
}

export const products: Product[] = [
  {
    id: 'prod_black_tee',
    priceId: 'price_1RgTl100QL3l2eWUTfMpkxVy',
    name: 'slop logo tee — black',
    description: 'Core backpiece logo on a heavyweight black tee.',
    mode: 'payment',
    price: 20,
    color: 'black',
    image: 'https://images.pexels.com/photos/5698853/pexels-photo-5698853.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    id: 'prod_white_tee',
    priceId: 'price_1RgTl100QL3l2eWUTfMpkxVy',
    name: 'slop logo tee — white',
    description: 'Core backpiece logo on a heavyweight white tee.',
    mode: 'payment',
    price: 20,
    color: 'white',
    image: 'https://images.pexels.com/photos/5708053/pexels-photo-5708053.jpeg?auto=compress&cs=tinysrgb&w=800',
    sizes: ['s', 'm', 'l', 'xl'],
  },
];

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};
