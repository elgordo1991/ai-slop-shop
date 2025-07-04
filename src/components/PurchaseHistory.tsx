import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';

interface Purchase {
  id: string;
  sessionId: string;
  amountTotal: number;
  currency: string;
  status: string;
  quantity: number;
  createdAt: any;
}

export function PurchaseHistory() {
  const [user] = useAuthState(auth);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPurchases();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPurchases = async () => {
    if (!user) return;

    try {
      const purchasesRef = collection(db, 'customers', user.uid, 'purchases');
      const q = query(purchasesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const purchaseList: Purchase[] = [];
      querySnapshot.forEach((doc) => {
        purchaseList.push({
          id: doc.id,
          ...doc.data()
        } as Purchase);
      });
      
      setPurchases(purchaseList);
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-stone-300 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-stone-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-stone-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'unpaid':
        return 'text-red-600';
      case 'no_payment_required':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white border border-stone-300 p-4">
      <h3 className="text-lg font-medium mb-4 lowercase">purchase history</h3>
      
      {purchases.length === 0 ? (
        <p className="text-sm text-gray-600 lowercase">no purchases yet</p>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="border-b border-stone-200 pb-4 last:border-b-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium lowercase">
                    ai generated t-shirt × {purchase.quantity}
                  </p>
                  <p className="text-xs text-gray-600 lowercase">
                    {formatDate(purchase.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatAmount(purchase.amountTotal, purchase.currency)}
                  </p>
                  <p className={`text-xs lowercase ${getStatusColor(purchase.status)}`}>
                    {purchase.status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}