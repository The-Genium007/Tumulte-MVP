import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosResponse,
} from "axios";

/**
 * HTTP Client centralisé avec interceptors
 */
class HttpClient {
  private instance: AxiosInstance;

  constructor() {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase as string;
    const apiVersion = config.public.apiVersion as string;

    this.instance = axios.create({
      baseURL: `${apiBase}/api/${apiVersion}`,
      timeout: 30000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Ajouter des headers personnalisés si nécessaire
        // Exemple: token d'authentification si géré côté client
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        // Gestion centralisée des erreurs
        if (error.response) {
          const status = error.response.status;

          switch (status) {
            case 401:
              // Redirection vers la page de connexion
              if (process.client) {
                window.location.href = "/auth/twitch/redirect";
              }
              break;
            case 403:
              console.error("Accès interdit");
              break;
            case 404:
              console.error("Ressource non trouvée");
              break;
            case 500:
              console.error("Erreur serveur");
              break;
          }
        } else if (error.request) {
          console.error("Aucune réponse du serveur");
        } else {
          console.error(
            "Erreur de configuration de la requête:",
            error.message,
          );
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * GET request
   */
  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.instance.get<T>(url, { params });
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.instance.post<T>(url, data);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.instance.put<T>(url, data);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response = await this.instance.delete<T>(url);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.instance.patch<T>(url, data);
    return response.data;
  }
}

export const httpClient = new HttpClient();
export default httpClient;
