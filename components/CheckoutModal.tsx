
import React, { useState } from 'react';
import { X, Check, Crown, Zap, Shield, Loader2 } from 'lucide-react';
import { UserInfo } from '../types';

interface CheckoutModalProps {
  user: UserInfo;
  onClose: () => void;
  onSuccess: (tier: 'paid') => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ user, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handlePayment = () => {
    if (!window.Razorpay) {
      alert("Razorpay SDK failed to load. Please check your internet connection.");
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('idle');

    const options = {
      key: "rzp_live_S13GFNFWq7fhgm",
      amount: 10000, // Amount in paise (100 INR)
      currency: "INR",
      name: "Vekkam Engine",
      description: "Unlocked Tier Subscription",
      image: "https://vekkam.ai/favicon.ico", // Placeholder image
      handler: function (response: any) {
        setIsProcessing(false);
        if (response.razorpay_payment_id) {
          setPaymentStatus('success');
          setTimeout(() => {
            onSuccess('paid');
          }, 2000);
        } else {
          setPaymentStatus('error');
        }
      },
      prefill: {
        name: user.name,
        email: user.email,
      },
      theme: {
        color: "#2563eb",
      },
      modal: {
        ondismiss: function() {
          setIsProcessing(false);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      setIsProcessing(false);
      setPaymentStatus('error');
      console.error(response.error.description);
    });
    rzp.open();
  };

  if (paymentStatus === 'success') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md p-12 text-center shadow-2xl scale-in-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <Check size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Payment Successful!</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">Your account has been upgraded to the <strong>Unlocked Tier</strong>. Start outlearning your syllabus now.</p>
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
            <Loader2 className="animate-spin" size={16} /> Redirecting to workspace
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row scale-in-center">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 z-10">
          <X size={24} />
        </button>

        {/* Left Side: Branding */}
        <div className="md:w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -ml-20 -mb-20 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white text-blue-600 rounded-xl flex items-center justify-center font-extrabold text-2xl mb-8">V</div>
            <h2 className="text-4xl font-extrabold mb-6 leading-tight">Unlock Your Full Potential</h2>
            <ul className="space-y-6">
              {[
                { icon: Zap, text: '3 High-Speed Analyses per Day' },
                { icon: Shield, text: 'Unlimited Cloud History Storage' },
                { icon: Crown, text: 'Priority Local Engine Synthesis' },
                { icon: Check, text: 'Contextual AI Tutoring (TA)' }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-blue-100">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <item.icon size={20} />
                  </div>
                  <span className="font-medium text-lg">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="relative z-10 mt-12">
            <p className="text-blue-200 text-sm">Join 2,000+ top students crushing their exams with Vekkam.</p>
          </div>
        </div>

        {/* Right Side: Plans */}
        <div className="md:w-1/2 p-12 bg-white flex flex-col">
          <h3 className="text-2xl font-extrabold text-gray-900 mb-8">Choose Your Plan</h3>
          
          <div className="space-y-4 mb-12">
            <div className="p-6 rounded-3xl border-2 border-blue-600 bg-blue-50 relative">
              <div className="absolute -top-3 right-6 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Most Popular</div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-extrabold text-lg text-gray-900">Unlocked Tier</h4>
                  <p className="text-sm text-gray-500">Perfect for intense exam preparation.</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-gray-900">₹100</span>
                  <p className="text-xs text-gray-400 font-medium">/ MONTH</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-extrabold text-lg text-gray-900">Topper Tier</h4>
                  <p className="text-sm text-gray-500">Unlimited everything for groups.</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-gray-900">₹250</span>
                  <p className="text-xs text-gray-400 font-medium">/ MONTH</p>
                </div>
              </div>
            </div>
          </div>

          {paymentStatus === 'error' && (
            <p className="text-red-500 text-sm font-bold text-center mb-4">Payment failed. Please try again.</p>
          )}

          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-extrabold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mt-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" />
                Processing...
              </>
            ) : (
              'Upgrade Now via Razorpay'
            )}
          </button>
          
          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            By upgrading, you agree to our Terms of Service. Secure payments processed via Razorpay. No card details stored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
