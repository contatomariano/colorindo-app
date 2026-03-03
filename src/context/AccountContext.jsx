import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const LS_KEY = 'colorindo_selected_account_id';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
    const { profile, isAdmin } = useAuth();
    const [selectedAccountId, setSelectedAccountIdState] = useState(
        () => localStorage.getItem(LS_KEY) || null
    );
    const [account, setAccount] = useState(null);
    const [allAccounts, setAllAccounts] = useState([]);

    // Carrega contas acessíveis ao usuário autenticado
    useEffect(() => {
        if (!profile) return;

        let query = supabase.from('accounts')
            .select('id, name, plan, credits, status')
            .eq('status', 'active')
            .order('name');

        // Usuários não-admin veem apenas sua própria conta
        if (!isAdmin && profile.account_id) {
            query = query.eq('id', profile.account_id);
        }

        query.then(({ data }) => {
            if (data && data.length > 0) {
                setAllAccounts(data);
                const savedId = localStorage.getItem(LS_KEY);
                const validSaved = data.some(a => a.id === savedId);
                if (!validSaved) {
                    setSelectedAccountIdState(data[0].id);
                    localStorage.setItem(LS_KEY, data[0].id);
                }
            } else {
                setAllAccounts([]);
            }
        });
    }, [profile, isAdmin]);

    // Quando selectedAccountId muda, busca os dados da conta
    const refreshAccount = useCallback((id) => {
        const targetId = id || selectedAccountId || localStorage.getItem(LS_KEY);
        if (!targetId) return;
        supabase.from('accounts')
            .select('id, name, plan, credits, email, status')
            .eq('id', targetId)
            .single()
            .then(({ data }) => {
                if (data) {
                    setAccount(data);
                    setAllAccounts(prev =>
                        prev.map(a => a.id === data.id ? { ...a, credits: data.credits } : a)
                    );
                }
            });
    }, [selectedAccountId]);

    useEffect(() => { refreshAccount(selectedAccountId); }, [selectedAccountId]);

    function setSelectedAccountId(id) {
        localStorage.setItem(LS_KEY, id);
        setSelectedAccountIdState(id);
    }

    return (
        <AccountContext.Provider value={{ selectedAccountId, setSelectedAccountId, account, allAccounts, refreshAccount }}>
            {children}
        </AccountContext.Provider>
    );
}

export function useAccount() {
    return useContext(AccountContext);
}
