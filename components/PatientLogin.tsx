/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

interface PatientLoginProps {
    onLoginSuccess: (name: string, phone: string) => void;
}

// 2.3 Patient Binding Flow - Mock Database
const MOCK_HIS_DB: Record<string, { name: string, birthday: string }> = {
    "0912345678": { "name": "陳大明", "birthday": "19900101" },
    "0987654321": { "name": "林小美", "birthday": "19950520" }
};

const PatientLogin: React.FC<PatientLoginProps> = ({ onLoginSuccess }) => {
    const [step, setStep] = useState<'PHONE' | 'BIRTHDAY'>('PHONE');
    const [phone, setPhone] = useState('');
    const [birthday, setBirthday] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handlePhoneSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (phone.length < 10) {
            setError("請輸入有效的手機號碼。");
            return;
        }
        setStep('BIRTHDAY');
    };

    const handleBirthdaySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const patient = MOCK_HIS_DB[phone];
        
        if (patient && patient.birthday === birthday) {
            onLoginSuccess(patient.name, phone);
        } else {
            setError("找不到資料，請檢查您的手機號碼和生日。");
            // Reset to allow trying again easily
            setTimeout(() => {
                setStep('PHONE');
                setPhone('');
                setBirthday('');
                setError(null);
            }, 2000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gem-onyx">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gem-mist">
                <div className="flex justify-center mb-6">
                    <div className="h-16 w-16 bg-clinic-orange/10 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🏥</span>
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-gem-offwhite mb-2">
                    {step === 'PHONE' ? '身份綁定' : '驗證身份'}
                </h2>
                <p className="text-center text-gem-offwhite/60 mb-8">
                    {step === 'PHONE' ? '請輸入您的手機號碼以繼續。' : '請輸入您的生日 (YYYYMMDD)。'}
                </p>

                {step === 'PHONE' ? (
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gem-offwhite/80 mb-1">手機號碼</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0912345678"
                                className="w-full px-4 py-3 rounded-lg border border-gem-mist focus:ring-2 focus:ring-clinic-blue focus:border-clinic-blue outline-none transition-all"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-clinic-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
                        >
                            下一步
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleBirthdaySubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gem-offwhite/80 mb-1">生日</label>
                            <input
                                type="text"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                                placeholder="19900101"
                                maxLength={8}
                                className="w-full px-4 py-3 rounded-lg border border-gem-mist focus:ring-2 focus:ring-clinic-blue focus:border-clinic-blue outline-none transition-all"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-clinic-orange hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
                        >
                            驗證並登入
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('PHONE')}
                            className="w-full text-gem-offwhite/50 text-sm hover:text-gem-offwhite transition-colors"
                        >
                            返回
                        </button>
                    </form>
                )}
                
                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md text-center border border-red-100 animate-pulse">
                        {error}
                    </div>
                )}
            </div>
            
            <div className="mt-8 text-center text-gem-offwhite/40 text-xs">
                 <p>測試用模擬資料庫：</p>
                 <p>0912345678 / 19900101</p>
                 <p>0987654321 / 19950520</p>
            </div>
        </div>
    );
};

export default PatientLogin;