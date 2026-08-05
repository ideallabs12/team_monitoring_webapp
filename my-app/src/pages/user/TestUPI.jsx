import { useState } from 'react'
import { Smartphone, CheckCircle, AlertCircle } from 'lucide-react'

export default function TestUPI({ user }) {
  const [amount, setAmount] = useState('')
  const [userUpiId, setUserUpiId] = useState('')

  // Restrict access to specific users
  const allowedEmails = ['user1@gmail.com', 'tech1@gmail.com']
  
  if (!user || !allowedEmails.includes(user.email)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
        <div className="apple-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', color: '#ef4444' }}><AlertCircle size={48} /></div>
          <h2 style={{ marginBottom: '12px', color: 'var(--apple-text-primary)' }}>Access Restricted</h2>
          <p style={{ color: 'var(--apple-text-secondary)', lineHeight: '1.5' }}>
            This page is restricted to specific test accounts only.
          </p>
        </div>
      </div>
    )
  }

  const handlePayment = (e) => {
    e.preventDefault()
    if (!amount || !userUpiId) {
      alert("Please enter both amount and your UPI ID.")
      return
    }

    const payeeVPA = '9948781888@ybl'
    const payeeName = 'Ideallabs'
    const note = encodeURIComponent(`Payment from ${userUpiId}`)
    
    // Standard UPI deep link format
    const upiLink = `upi://pay?pa=${payeeVPA}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`

    // Attempt to open the UPI app
    window.location.href = upiLink
  }

  return (
    <div className="apple-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 className="apple-title">Test UPI Payment</h1>
        <p className="apple-subtitle">Enter amount and your UPI ID to trigger a payment request.</p>
      </div>

      <div className="apple-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', color: 'var(--apple-accent-blue)' }}>
          <Smartphone size={48} />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--apple-text-primary)' }}>Make a Payment</h2>
        
        <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="apple-label">Amount (INR)</label>
            <input 
              type="number" 
              required 
              min="1"
              step="any"
              placeholder="e.g. 100"
              className="apple-input" 
              style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }} 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
            />
          </div>

          <div>
            <label className="apple-label">Your UPI ID (For tracking)</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. name@bank"
              className="apple-input" 
              style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }} 
              value={userUpiId} 
              onChange={e => setUserUpiId(e.target.value)} 
            />
          </div>

          <button type="submit" className="apple-btn" style={{ marginTop: '12px', padding: '14px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} /> Open UPI App to Pay
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>
          <strong>Note:</strong> This will attempt to open any installed UPI apps (GPay, PhonePe, Paytm, etc.) on your mobile device. Payee is set to <strong>9948781888@ybl</strong>.
        </div>
      </div>
    </div>
  )
}
