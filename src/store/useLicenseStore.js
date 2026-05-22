import { create } from 'zustand';
import api from '../services/api';
import { validarLicencaLocal, obterChaveLicencaAtiva } from '../services/licenca';

const useLicenseStore = create((set) => ({
  machineId: '',
  licenseStatus: {
    loading: true,
    valida: false,
    expiraEm: null,
    diasRestantes: 0,
    motivo: 'Verificando licença...'
  },
  
  verificarLicenca: async () => {
    try {
      const machineId = await api.licenca.getMachineId();
      const chave = obterChaveLicencaAtiva();
      const status = validarLicencaLocal(chave, machineId);
      
      set({ 
        machineId, 
        licenseStatus: { 
          loading: false, 
          ...status 
        } 
      });
      return status;
    } catch (err) {
      console.error("Erro ao verificar licença:", err);
      set({
        licenseStatus: {
          loading: false,
          valida: false,
          expiraEm: null,
          diasRestantes: 0,
          motivo: 'Erro interno ao validar hardware da máquina.'
        }
      });
      return { valida: false };
    }
  }
}));

export default useLicenseStore;
