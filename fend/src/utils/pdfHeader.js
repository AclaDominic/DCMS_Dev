import logo from '../pages/logo.png';

/**
 * Adds clinic header with logo and name to PDF documents
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {number} startY - The Y position to start the header (default: 20)
 * @returns {Promise<number>} - The Y position after the header for subsequent content
 */
export const addClinicHeader = async (doc, startY = 20) => {
  try {
    // Add logo to PDF (convert image to base64 and add)
    const logoBase64 = await convertImageToBase64(logo);
    
    // Add logo image (32x32 pixels, positioned at top left)
    doc.addImage(logoBase64, 'PNG', 20, startY, 32, 32);
    
    // Add clinic name next to logo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Kreative Dental & Orthodontics', 60, startY + 20);
    
    // Add a subtle line under the header
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, startY + 40, doc.internal.pageSize.getWidth() - 20, startY + 40);
    
    // Return the Y position after the header for subsequent content
    return startY + 50;
  } catch (error) {
    console.error('Error adding clinic header to PDF:', error);
    // Fallback: just add text without logo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Kreative Dental & Orthodontics', 20, startY + 20);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, startY + 40, doc.internal.pageSize.getWidth() - 20, startY + 40);
    return startY + 50;
  }
};

/**
 * Converts an image file to base64 string
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Base64 encoded image string
 */
const convertImageToBase64 = (imagePath) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL('image/png');
      resolve(base64);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imagePath;
  });
};
