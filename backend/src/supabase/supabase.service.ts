import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    // Intentar obtener SUPABASE_KEY o VITE_SUPABASE_ANON_KEY como respaldo
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY') || 
                      this.configService.get<string>('VITE_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase URL or Key not found in environment variables. DB operations will fail.');
      if (!supabaseUrl) console.log('ERROR: Falta SUPABASE_URL');
      if (!supabaseKey) console.log('ERROR: Falta SUPABASE_KEY / VITE_SUPABASE_ANON_KEY');
      return;
    }

    this.clientInstance = createClient(supabaseUrl, supabaseKey);
    this.logger.log('SUPABASE CONECTADO CON ÉXITO');
  }

  getClient(): SupabaseClient {
    if (!this.clientInstance) {
      throw new Error('Supabase client not initialized. Check environment variables.');
    }
    return this.clientInstance;
  }
}
