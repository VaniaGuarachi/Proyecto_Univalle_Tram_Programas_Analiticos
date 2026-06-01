"use client";

import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, CheckCircle2, Download, Receipt, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function CheckoutPago() {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const { items, total, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const router = useRouter();

  const totalPrice = total();
  const numItems = items.length;

  const handlePay = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/estudiante/pago/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id_usuario,
          items: items.map(i => ({ id: i.id, price: i.price })),
          totalPrice
        })
      });

      if (res.ok) {
        setPaso(2);
        clearCart();
      }
    } catch (error) {
       console.error("Error confirmando pago:", error);
    } finally {
      setLoading(false);
    }
  };

  if (numItems === 0 && paso === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
        <Receipt size={64} className="text-slate-300 mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">No hay items para pagar</h2>
        <p className="text-slate-500 mb-8 font-medium">Agrega servicios o trámites a tu carrito para continuar.</p>
        <Link href="/estudiante/dashboard">
          <Button variant="outline" className="gap-2"><ArrowLeft size={16} /> Volver a Inicio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4">
      
      {paso === 1 && (
        <>
          <Link href="/estudiante/tramites" className="inline-flex items-center text-slate-500 hover:text-univalle-primary mb-6 transition-colors font-black text-xs gap-2 uppercase tracking-widest">
            <ArrowLeft size={16} /> Regresar al Catálogo
          </Link>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Checkout de Pago</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                 <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Resumen de Orden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6 bg-white">
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                       <span className="text-slate-600 font-medium line-clamp-1 pr-4">{item.name}</span>
                       <span className="font-black text-slate-900 whitespace-nowrap">Bs. {item.price}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 flex justify-between items-center text-2xl font-black text-slate-900">
                  <span>Total</span>
                  <span className="text-univalle-action">Bs. {totalPrice}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-univalle-primary/20 shadow-xl bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-8 text-center flex flex-col items-center justify-center h-full">
                <div className="bg-univalle-primary/10 text-univalle-primary px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                   Paga con Código QR
                </div>
                <div className="w-52 h-52 bg-white p-4 rounded-3xl shadow-lg border border-slate-100 mb-6 flex justify-center items-center relative group">
                   <div className="w-full h-full bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UNIVALLE_PAGO_REAL')] bg-cover rounded-xl" />
                   <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-2xl">QR OFICIAL UNIVALLE</span>
                   </div>
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-8 leading-relaxed px-4">
                  Escanea desde tu app bancaria. Una vez transferido, haz clic abajo.
                </p>
                
                <Button 
                  className="w-full h-14 text-sm font-black uppercase tracking-widest bg-univalle-primary hover:bg-univalle-hover shadow-lg shadow-univalle-primary/20 rounded-xl" 
                  onClick={handlePay}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "He realizado el pago"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {paso === 2 && (
        <Card className="border-0 shadow-2xl mt-8 text-center py-20 px-8 rounded-[40px] bg-white animate-in zoom-in slide-in-from-bottom-10 duration-700">
           <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-emerald-50/50">
             <CheckCircle2 size={48} />
           </div>
           <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">¡Pago Registrado correctamente!</h1>
           <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed">
             Tu transacción por <span className="text-slate-900 font-black">Bs. {totalPrice}</span> ha sido enviada a revisión. Podrás seguir el progreso en tu historial.
           </p>
           
           <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button variant="outline" className="h-14 px-8 rounded-xl font-black uppercase text-xs tracking-widest gap-2 text-slate-700 border-slate-200 hover:bg-slate-50">
                <Download size={18} /> Comprobante
              </Button>
              <Link href="/estudiante/dashboard">
                <Button className="h-14 px-8 rounded-xl font-black uppercase text-xs tracking-widest gap-2 w-full sm:w-auto shadow-lg">
                   Volver al Inicio
                </Button>
              </Link>
           </div>
        </Card>
      )}

    </div>
  );
}
