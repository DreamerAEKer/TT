export class TranslationService {
  private apiUrl = 'https://api.mymemory.translated.net/get';

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!text.trim()) return '';
    
    try {
      const response = await fetch(
        `${this.apiUrl}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
      );
      const data = await response.json();
      
      if (data.responseData) {
        return data.responseData.translatedText;
      }
      throw new Error('Translation failed');
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text on error
    }
  }
}

export const translationService = new TranslationService();
