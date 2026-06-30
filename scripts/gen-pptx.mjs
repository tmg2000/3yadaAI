import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'guides');
const SCR_DIR = path.join(process.cwd(), 'guides', 'screenshots');

const FONT = 'Arial';
const RTL = true;

// Custom professional themes (hex values without #)
const COLORS = {
  overview: { bg: '0F172A', accent: '3B82F6', light: 'F8FAFC', text: '1E293B', cardBorder: 'E2E8F0', success: '10B981', danger: 'EF4444' }, // Navy / Blue
  patient:  { bg: '064E3B', accent: '059669', light: 'F0FDF4', text: '1E293B', cardBorder: 'D1FAE5', success: '10B981', danger: 'EF4444' }, // Emerald / Mint
  doctor:   { bg: '0F5132', accent: '198754', light: 'F4FBF7', text: '1E293B', cardBorder: 'D1FAE5', success: '198754', danger: 'DC3545' }, // Forest Green
  admin:    { bg: '5C0612', accent: '8B0000', light: 'FFF5F5', text: '1E293B', cardBorder: 'FDE8E8', success: '198754', danger: 'DC3545' }, // Burgundy / Rose
};

// ====================================================
// SLIDE DESIGN UTILITIES
// ====================================================

// Elegant Slide Header Helper
function addSlideHeader(prs, slide, title, color) {
  // Add slide title
  slide.addText(title, { 
    x: 0.5, y: 0.25, w: 9.0, h: 0.6, 
    fontSize: 22, color: color.bg, bold: true, 
    align: 'right', fontFace: FONT, rtlMode: RTL 
  });
  
  // Sleek accent line below title
  slide.addShape(prs.ShapeType.rect, { 
    x: 0.5, y: 0.85, w: 9.0, h: 0.04, 
    fill: { color: color.accent } 
  });
  
  // Platform badge in the top-left
  slide.addText('عيادة AI', { 
    x: 0.5, y: 0.25, w: 2.0, h: 0.4, 
    fontSize: 10, color: '94A3B8', 
    fontFace: FONT, align: 'left', bold: true 
  });
}

// 1. Welcome Slide
function addTitleSlide(prs, title, subtitle, color) {
  const slide = prs.addSlide();
  slide.background = { fill: color.bg };
  
  // Top decorative accent line
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.15, fill: { color: color.accent } });
  
  // Large Title
  slide.addText(title, { 
    x: 0.5, y: 1.6, w: 9.0, h: 1.2, 
    fontSize: 34, color: 'FFFFFF', bold: true, 
    align: 'center', fontFace: FONT, rtlMode: RTL 
  });
  
  // Thin divider line
  slide.addShape(prs.ShapeType.rect, { x: 3.5, y: 3.0, w: 3.0, h: 0.03, fill: { color: color.accent } });
  
  // Subtitle
  slide.addText(subtitle, { 
    x: 0.5, y: 3.3, w: 9.0, h: 1.2, 
    fontSize: 18, color: 'CBD5E1', 
    align: 'center', fontFace: FONT, rtlMode: RTL,
    lineSpacingMultiple: 1.4
  });
  
  // Footer
  slide.addText('منصة عيادة AI الذكية • © 2026', { 
    x: 0.5, y: 5.0, w: 9.0, h: 0.4, 
    fontSize: 11, color: '64748B', 
    align: 'center', fontFace: FONT, rtlMode: RTL 
  });
}

// 2. Section Slide (Intro transitions)
function addSectionSlide(prs, title, color) {
  const slide = prs.addSlide();
  slide.background = { fill: color.light };
  
  // Left vertical accent stripe
  slide.addShape(prs.ShapeType.rect, { x: 9.7, y: 0, w: 0.3, h: 5.625, fill: { color: color.bg } });
  
  // Subtitle/Label
  slide.addText('المحور الرئيسي', {
    x: 0.5, y: 1.8, w: 9.0, h: 0.4,
    fontSize: 14, color: color.accent, bold: true,
    align: 'right', fontFace: FONT, rtlMode: RTL
  });
  
  // Section Title
  slide.addText(title, { 
    x: 0.5, y: 2.3, w: 9.0, h: 2.0, 
    fontSize: 32, color: color.bg, bold: true, 
    align: 'right', fontFace: FONT, rtlMode: RTL 
  });
}

// 3. Table of Contents Slide
function addTocSlide(prs, items, color) {
  const slide = prs.addSlide();
  slide.background = { fill: 'FFFFFF' };
  
  addSlideHeader(prs, slide, 'جدول المحتويات', color);
  
  const half = Math.ceil(items.length / 2);
  const col1 = items.slice(0, half).map((item, i) => `${i + 1}. ${item}`).join('\n');
  const col2 = items.slice(half).map((item, i) => `${i + half + 1}. ${item}`).join('\n');
  
  // Left Column Card
  slide.addShape(prs.ShapeType.rect, { x: 0.5, y: 1.2, w: 4.3, h: 3.9, fill: { color: 'F8FAFC' }, line: { color: 'F1F5F9', width: 1.5 } });
  slide.addText(col2, {
    x: 0.7, y: 1.4, w: 3.9, h: 3.5,
    fontSize: 15, color: color.text,
    align: 'right', valign: 'top', fontFace: FONT, rtlMode: RTL,
    lineSpacingMultiple: 1.4
  });
  
  // Right Column Card
  slide.addShape(prs.ShapeType.rect, { x: 5.2, y: 1.2, w: 4.3, h: 3.9, fill: { color: 'F8FAFC' }, line: { color: 'F1F5F9', width: 1.5 } });
  slide.addText(col1, {
    x: 5.4, y: 1.4, w: 3.9, h: 3.5,
    fontSize: 15, color: color.text,
    align: 'right', valign: 'top', fontFace: FONT, rtlMode: RTL,
    lineSpacingMultiple: 1.4
  });
}

// 4. Two Column Comparative Card Slide (e.g. Problems vs Solutions)
function addTwoColumnCardSlide(prs, title, col1Title, col1Items, col2Title, col2Items, color) {
  const slide = prs.addSlide();
  slide.background = { fill: 'FFFFFF' };
  
  addSlideHeader(prs, slide, title, color);
  
  // Column 1 (Traditional systems - Red themed)
  slide.addShape(prs.ShapeType.rect, { 
    x: 0.5, y: 1.1, w: 4.3, h: 4.1, 
    fill: { color: 'FEF2F2' }, 
    line: { color: 'FEE2E2', width: 2 } 
  });
  
  slide.addText(col1Title, { 
    x: 0.7, y: 1.3, w: 3.9, h: 0.5, 
    fontSize: 16, color: color.danger || 'EF4444', bold: true, 
    align: 'right', fontFace: FONT, rtlMode: RTL 
  });
  
  const col1Text = col1Items.map(item => `• ${item}`).join('\n\n');
  slide.addText(col1Text, {
    x: 0.7, y: 1.9, w: 3.9, h: 3.1,
    fontSize: 13, color: '4B5563',
    align: 'right', valign: 'top', fontFace: FONT, rtlMode: RTL,
    lineSpacingMultiple: 1.4
  });
  
  // Column 2 (3yada AI - Green themed)
  slide.addShape(prs.ShapeType.rect, { 
    x: 5.2, y: 1.1, w: 4.3, h: 4.1, 
    fill: { color: 'ECFDF5' }, 
    line: { color: 'D1FAE5', width: 2 } 
  });
  
  slide.addText(col2Title, { 
    x: 5.4, y: 1.3, w: 3.9, h: 0.5, 
    fontSize: 16, color: color.success || '10B981', bold: true, 
    align: 'right', fontFace: FONT, rtlMode: RTL 
  });
  
  const col2Text = col2Items.map(item => `• ${item}`).join('\n\n');
  slide.addText(col2Text, {
    x: 5.4, y: 1.9, w: 3.9, h: 3.1,
    fontSize: 13, color: '1F2937',
    align: 'right', valign: 'top', fontFace: FONT, rtlMode: RTL,
    lineSpacingMultiple: 1.4
  });
}

// 5. Three Column Cards Slide (e.g. Overview of Patient, Doctor, Admin)
function addThreeCardHorizontalSlide(prs, title, cards, color) {
  const slide = prs.addSlide();
  slide.background = { fill: 'FFFFFF' };
  
  addSlideHeader(prs, slide, title, color);
  
  const cardW = 2.7;
  const gap = 0.4;
  const startX = 0.5;
  
  cards.forEach((card, idx) => {
    const xPos = startX + idx * (cardW + gap);
    
    // Card Background
    slide.addShape(prs.ShapeType.rect, { 
      x: xPos, y: 1.3, w: cardW, h: 3.9, 
      fill: { color: 'FFFFFF' }, 
      line: { color: color.cardBorder, width: 2 } 
    });
    
    // Top colored stripe on the card
    slide.addShape(prs.ShapeType.rect, { 
      x: xPos, y: 1.3, w: cardW, h: 0.1, 
      fill: { color: color.accent } 
    });
    
    // Icon
    slide.addText(card.icon, {
      x: xPos + 0.2, y: 1.6, w: cardW - 0.4, h: 0.6,
      fontSize: 32, align: 'center', fontFace: FONT
    });
    
    // Title
    slide.addText(card.title, {
      x: xPos + 0.1, y: 2.3, w: cardW - 0.2, h: 0.5,
      fontSize: 16, color: color.bg, bold: true,
      align: 'center', fontFace: FONT, rtlMode: RTL
    });
    
    // Description
    slide.addText(card.desc, {
      x: xPos + 0.15, y: 2.9, w: cardW - 0.3, h: 2.1,
      fontSize: 12, color: '4B5563',
      align: 'center', valign: 'top', fontFace: FONT, rtlMode: RTL,
      lineSpacingMultiple: 1.3
    });
  });
}

// 6. 2x2 Grid of Cards Slide (e.g. Detailed platform features)
function addFourCardGridSlide(prs, title, cards, color) {
  const slide = prs.addSlide();
  slide.background = { fill: 'FFFFFF' };
  
  addSlideHeader(prs, slide, title, color);
  
  const cardW = 4.3;
  const cardH = 1.9;
  const gapX = 0.4;
  const gapY = 0.3;
  const startX = 0.5;
  const startY = 1.2;
  
  const coordinates = [
    { x: startX, y: startY },
    { x: startX + cardW + gapX, y: startY },
    { x: startX, y: startY + cardH + gapY },
    { x: startX + cardW + gapX, y: startY + cardH + gapY }
  ];
  
  cards.forEach((card, idx) => {
    if (idx >= 4) return;
    const { x, y } = coordinates[idx];
    
    // Card Box
    slide.addShape(prs.ShapeType.rect, { 
      x: x, y: y, w: cardW, h: cardH, 
      fill: { color: 'FFFFFF' }, 
      line: { color: 'F1F5F9', width: 1.5 } 
    });
    
    // Side stripe (RTL: right side)
    slide.addShape(prs.ShapeType.rect, { 
      x: x + cardW - 0.08, y: y, w: 0.08, h: cardH, 
      fill: { color: color.accent } 
    });
    
    // Icon (RTL: upper right side)
    slide.addText(card.icon, {
      x: x + cardW - 0.8, y: y + 0.15, w: 0.6, h: 0.5,
      fontSize: 24, align: 'center', fontFace: FONT
    });
    
    // Title (RTL: next to icon)
    slide.addText(card.title, {
      x: x + 0.2, y: y + 0.15, w: cardW - 1.1, h: 0.5,
      fontSize: 15, color: color.bg, bold: true,
      align: 'right', fontFace: FONT, rtlMode: RTL
    });
    
    // Description (RTL: below title)
    slide.addText(card.desc, {
      x: x + 0.2, y: y + 0.75, w: cardW - 0.4, h: 1.0,
      fontSize: 11, color: '4B5563',
      align: 'right', valign: 'top', fontFace: FONT, rtlMode: RTL,
      lineSpacingMultiple: 1.3
    });
  });
}

// 7. 4-Metrics KPI/Stats Slide (e.g. ROI / Performance metrics)
function addMetricsSlide(prs, title, metrics, color) {
  const slide = prs.addSlide();
  slide.background = { fill: 'FFFFFF' };
  
  addSlideHeader(prs, slide, title, color);
  
  const cardW = 2.0;
  const gap = 0.3;
  const startX = 0.5;
  
  metrics.forEach((metric, idx) => {
    if (idx >= 4) return;
    const xPos = startX + idx * (cardW + gap);
    
    // Card Box
    slide.addShape(prs.ShapeType.rect, { 
      x: xPos, y: 1.3, w: cardW, h: 3.9, 
      fill: { color: 'F8FAFC' }, 
      line: { color: color.cardBorder, width: 2 } 
    });
    
    // Top accent stripe
    slide.addShape(prs.ShapeType.rect, { 
      x: xPos, y: 1.3, w: cardW, h: 0.12, 
      fill: { color: color.accent } 
    });
    
    // Stat Number
    slide.addText(metric.number, {
      x: xPos + 0.1, y: 1.6, w: cardW - 0.2, h: 0.7,
      fontSize: 28, color: color.accent, bold: true,
      align: 'center', fontFace: FONT
    });
    
    // Label
    slide.addText(metric.label, {
      x: xPos + 0.1, y: 2.3, w: cardW - 0.2, h: 0.5,
      fontSize: 14, color: color.bg, bold: true,
      align: 'center', fontFace: FONT, rtlMode: RTL
    });
    
    // Description
    slide.addText(metric.desc, {
      x: xPos + 0.1, y: 2.9, w: cardW - 0.2, h: 2.1,
      fontSize: 11, color: '4B5563',
      align: 'center', valign: 'top', fontFace: FONT, rtlMode: RTL,
      lineSpacingMultiple: 1.3
    });
  });
}

// 8. Refined Content/Bullets Slide (with nice Card formatting)
function addContentSlide(prs, title, bullets, color, opts = {}) {
  const slide = prs.addSlide();
  slide.background = { fill: 'FFFFFF' };
  
  addSlideHeader(prs, slide, title, color);
  
  const yPos = opts.tableY || 1.3;
  const hPos = 5.2 - yPos;
  
  // Format bullets with nice icons/emojis
  const text = bullets.map(b => b.trim().startsWith('•') || b.trim().startsWith('✅') || b.trim().startsWith('❌') || b.trim().startsWith('🟢') || b.trim().startsWith('🔴') || b.trim().startsWith('🔹') ? b : `🔹 ${b}`).join('\n\n');
  
  // Card Container
  slide.addShape(prs.ShapeType.rect, {
    x: 0.5, y: yPos, w: 9.0, h: hPos,
    fill: { color: 'F8FAFC' },
    line: { color: 'F1F5F9', width: 1.5 }
  });
  
  slide.addText(text, { 
    x: 0.8, y: yPos + 0.2, w: 8.4, h: hPos - 0.4, 
    fontSize: opts.fontSize || 15, color: color.text, 
    align: 'right', valign: 'top', fontFace: FONT, rtlMode: RTL, 
    lineSpacingMultiple: 1.4 
  });
}

// 9. Structured Table Slide
function addTableSlide(prs, title, headers, rows, color) {
  const slide = prs.addSlide();
  slide.background = { fill: 'FFFFFF' };
  
  addSlideHeader(prs, slide, title, color);
  
  const headerRow = headers.map(h => ({ 
    text: h, 
    options: { 
      fill: { color: color.bg }, 
      color: 'FFFFFF', 
      bold: true, 
      fontSize: 14, 
      fontFace: FONT, 
      align: 'center', 
      rtlMode: RTL 
    } 
  }));
  
  const dataRows = rows.map(row => row.map(cell => ({ 
    text: cell, 
    options: { 
      fontSize: 12, 
      fontFace: FONT, 
      align: 'right', 
      rtlMode: RTL, 
      color: color.text,
      fill: { color: 'FFFFFF' }
    } 
  })));
  
  slide.addTable([headerRow, ...dataRows], { 
    x: 0.5, y: 1.3, w: 9.0, 
    fontSize: 12, 
    border: { color: 'E2E8F0', pt: 1 }, 
    colW: headers.map(() => 9.0 / headers.length), 
    rowH: 0.45, 
    autoPage: false 
  });
}

// 10. Screenshot Showcase Slide
function addScreenshotSlide(prs, title, screenshotName, color, caption) {
  const filePath = path.join(SCR_DIR, `${screenshotName}.png`);
  if (!fs.existsSync(filePath)) {
    console.log(`     ⚠️ Screenshot not found: ${screenshotName}.png`);
    return;
  }
  const slide = prs.addSlide();
  slide.background = { fill: 'FFFFFF' };
  
  addSlideHeader(prs, slide, title, color);
  
  slide.addImage({ path: filePath, x: 0.5, y: 1.1, w: 9.0, h: 3.8 });
  
  if (caption) {
    slide.addText(caption, { 
      x: 0.5, y: 5.0, w: 9.0, h: 0.4, 
      fontSize: 12, color: '64748B', 
      align: 'center', fontFace: FONT, rtlMode: RTL 
    });
  }
}

// 11. Closing Slide
function addThankYouSlide(prs, color) {
  const slide = prs.addSlide();
  slide.background = { fill: color.bg };
  
  // Accent vertical stripe
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.15, fill: { color: color.accent } });
  
  slide.addText('شكراً لمتابعتكم', { 
    x: 0.5, y: 1.8, w: 9.0, h: 1.2, 
    fontSize: 38, color: 'FFFFFF', bold: true, 
    align: 'center', fontFace: FONT, rtlMode: RTL 
  });
  
  slide.addText('عيادة AI — 3yada AI Clinic', { 
    x: 0.5, y: 3.0, w: 9.0, h: 0.6, 
    fontSize: 20, color: 'E2E8F0', 
    align: 'center', fontFace: FONT, rtlMode: RTL 
  });
  
  slide.addText('جميع الحقوق محفوظة © 2026', { 
    x: 0.5, y: 5.0, w: 9.0, h: 0.4, 
    fontSize: 12, color: '94A3B8', 
    align: 'center', fontFace: FONT, rtlMode: RTL 
  });
}

// ====================================================
// OVERVIEW / PITCH DECK PRESENTATION (NEW & HIGHLY PERSUASIVE)
// ====================================================
function genOverview(color) {
  const prs = new PptxGenJS();
  prs.defineLayout({ name: 'WIDE', width: 10, height: 5.625 });
  prs.layout = 'WIDE';

  addTitleSlide(prs, 'منصة عيادة AI', 'الثورة الرقمية في إدارة الرعاية الصحية والعيادات الذكية\nربط المرضى والأطباء وإدارة المستشفيات بالذكاء الاصطناعي التوليدي', color);
  
  addTocSlide(prs, [
    'التحديات الطبية والحلول الرقمية',
    'منظومة عيادة AI المتكاملة',
    'المحور الأول: تجربة المريض الذكية',
    'المحور الثاني: إدارة العيادة للطبيب',
    'المحور الثالث: لوحة التحكم للمشرف',
    'العائد المالي والتشغيلي للاستثمار (ROI)',
    'الأمن والتكامل التقني للمستشفيات',
    'الخاتمة ورؤيتنا للمستقبل'
  ], color);

  addSectionSlide(prs, 'التحديات الطبية والحلول الرقمية', color);

  addTwoColumnCardSlide(prs, 'التحديات وحلول المنصة', 
    '🔴 النظام التقليدي بالعيادات والمستشفيات', 
    [
      'إهدار الوقت: الطبيب يقضي 40% من وقت الكشف في كتابة التاريخ وسؤال المريض عن التفاصيل المبدئية.',
      'فوضى المواعيد: صعوبة جدولة المرضى وقبول الحجوزات وإدارتها يدوياً مما يسبب ازدحاماً وتشتتاً.',
      'فقدان وتشتت السجلات الطبية: تشتت السجلات بين أوراق وتطبيقات مختلفة وفقدان سجل التاريخ المرضي.'
    ], 
    '🟢 الحلول الذكية مع منصة عيادة AI', 
    [
      'توفير الوقت: يدخل المريض الكشف ومعه ملخص طبي جاهز بالذكاء الاصطناعي (الأعراض، المدة، الخطورة).',
      'أتمتة كاملة للجدولة: نظام حجز إلكتروني فوري يربط المريض بالتقويم الفعلي للطبيب والمدفوعات.',
      'سجل طبي موحد (EMR): ملف رقمي مركزي لكل مريض يضم كافة الزيارات والتقارير والروشتات السابقة.'
    ], 
    color
  );

  addSectionSlide(prs, 'منظومة عيادة AI المتكاملة', color);

  addThreeCardHorizontalSlide(prs, 'منظومة عيادة AI المتكاملة', [
    { 
      icon: '📱', 
      title: 'منصة المريض', 
      desc: 'فحص أعراض ذكي باللغة العربية، إعداد تقرير طبي احترافي للطبيب، حجز فوري لدى الطبيب والتخصص المناسب حسب المدينة والتأمين.' 
    },
    { 
      icon: '👨‍⚕️', 
      title: 'منصة الطبيب', 
      desc: 'لوحة تحكم تفاعلية لإدارة المواعيد والمدفوعات، ملف EMR رقمي متكامل، إصدار وصفات طبية إلكترونية، ودفتر حسابات مالي.' 
    },
    { 
      icon: '🔧', 
      title: 'لوحة المشرف (Admin)', 
      desc: 'إحصائيات المنصة اللحظية، وتدقيق المستندات الطبية لتفعيل حسابات الأطباء، ومراقبة الجودة، وإدارة باقات الاشتراكات والموظفين.' 
    }
  ], color);

  addSectionSlide(prs, 'المحور الأول: منصة المريض', color);

  addFourCardGridSlide(prs, 'مميزات منصة المريض الذكية', [
    { 
      icon: '💬', 
      title: 'استشارة تفاعلية بالذكاء الاصطناعي', 
      desc: 'محادثة ذكية باللغة العربية لشرح الأعراض، مع إمكانية رفع صور وتقارير PDF وتحليلها فورياً لتقديم فهم أولي دقيق.' 
    },
    { 
      icon: '📋', 
      title: 'توليد الملخص الطبي التلقائي', 
      desc: 'يقوم الذكاء الاصطناعي بتحديد شكوى المريض، الأعراض، مدتها، ومستوى خطورتها بدقة شديدة لتوجيه الطبيب فور الكشف.' 
    },
    { 
      icon: '🎯', 
      title: 'التوجيه الذكي للتخصص', 
      desc: 'ترشيح التخصص الطبي الأنسب للمريض بناءً على الفحص، مع فلاتر للمدينة والشركات التأمينية المقبولة لتسهيل الحجز.' 
    },
    { 
      icon: '📅', 
      title: 'إدارة مواعيد وحجوزات فورية', 
      desc: 'حجز موعد بضغطة زر، إرسال طلبات تعديل المواعيد، ومتابعة حالة الطلب إلكترونياً بالكامل بكل سهولة وسرعة.' 
    }
  ], color);

  addSectionSlide(prs, 'المحور الثاني: منصة الطبيب', color);

  addFourCardGridSlide(prs, 'لوحة إدارة العيادة للأطباء', [
    { 
      icon: '📅', 
      title: 'جدولة ومواعيد تفاعلية', 
      desc: 'التحكم الكامل بجدول المواعيد اليومي، قبول أو رفض الحجوزات أو طلبات التعديل، وإنهاء الكشف بنقرة واحدة.' 
    },
    { 
      icon: '👥', 
      title: 'السجل الطبي الإلكتروني (EMR)', 
      desc: 'ملف صحي شامل وسهل الاستخدام لكل مريض، يتيح مراجعة التاريخ المرضي للزيارات السابقة والتحاليل والمرفقات.' 
    },
    { 
      icon: '💊', 
      title: 'الوصفات الطبية الرقمية', 
      desc: 'إصدار روشتة إلكترونية بجرعات دقيقة وتكرار محدد، وحفظها تلقائياً بملف المريض للرجوع إليها لاحقاً لمنع الأخطاء.' 
    },
    { 
      icon: '💳', 
      title: 'إدارة مالية واشتراكات العيادة', 
      desc: 'تتبع لحظي للإيرادات والفواتير والمدفوعات الإلكترونية، ومتابعة باقة اشتراك الطبيب بالمنصة بوضوح تام.' 
    }
  ], color);

  addSectionSlide(prs, 'المحور الثالث: لوحة المشرف الإدارية', color);

  addFourCardGridSlide(prs, 'لوحة التحكم والرقابة الإدارية المركزية', [
    { 
      icon: '📊', 
      title: 'إحصائيات وتحليلات حية', 
      desc: 'مراقبة حية للأداء المالي، وأعداد المرضى النشطين، والمدفوعات، ومعدل إتمام الحجوزات واستخدام الذكاء الاصطناعي.' 
    },
    { 
      icon: '👨‍⚕️', 
      title: 'تدقيق الأطباء وتوثيق الحسابات', 
      desc: 'مراجعة تراخيص مزاولة المهنة المرفوعة وهوية الأطباء لتفعيل الحسابات، مع استيراد وتصدير بيانات الأطباء كـ CSV.' 
    },
    { 
      icon: '💬', 
      title: 'رقابة المحادثات وضمان الجودة', 
      desc: 'مراجعة وتتبع المحادثات مع AI وملفاتها المرفقة لمكافحة سوء الاستخدام ومراقبة الدقة الطبية للردود وجودتها.' 
    },
    { 
      icon: '🔐', 
      title: 'إدارة باقات الأطباء وصلاحيات العمل', 
      desc: 'التحكم بباقات اشتراكات الأطباء (مجاني، أساسي، مميز)، وإضافة وتعيين صلاحيات فريق العمل من المشرفين.' 
    }
  ], color);

  addSectionSlide(prs, 'العائد المالي والتشغيلي للاستثمار (ROI)', color);

  addMetricsSlide(prs, 'العائد الاستثماري لملاك المستشفيات والمدراء', [
    { 
      number: '40%+', 
      label: 'توفير وقت الفحص', 
      desc: 'إعداد الملخص الطبي وتاريخ الأعراض للمريض مسبقاً يوفر وقت الطبيب، مما يرفع سعة العيادة اليومية بمعدل 25%.' 
    },
    { 
      number: '30%+', 
      label: 'تقليل التكاليف الإدارية', 
      desc: 'تعتمد المنصة على الجدولة الذكية المؤتمتة والروشتات والفواتير الرقمية، مما يقلل الهدر الإداري والورقي تماماً.' 
    },
    { 
      number: '98%', 
      label: 'رضا وولاء المرضى', 
      desc: 'إلغاء فترات الانتظار ومنح المريض وسيلة ذكية لفهم أعراضه يعزز بشكل كبير تجربة المريض ورضاه عن المنشأة الطبية.' 
    },
    { 
      number: '100%', 
      label: 'شفافية مالية تامة', 
      desc: 'مراقبة فورية لإيرادات العيادات، تذاكر الكشف، الاشتراكات والمدفوعات الإلكترونية عبر لوحة تحكم إدارية موحدة.' 
    }
  ], color);

  addSectionSlide(prs, 'التكامل الفني وجودة النظام', color);

  addContentSlide(prs, 'الأمان والجاهزية التقنية للمنصة', [
    'حماية بيانات المرضى: تشفير كامل لكافة السجلات والاتصالات لحماية الخصوصية وتوافقها مع المعايير الصحية العالمية.',
    'جاهزية الدمج والربط (HIS Integration): المنصة مصممة وقابلة للربط الفوري والتكامل مع النظم الطبية القائمة في المستشفيات والعيادات الكبرى عبر APIs.',
    'ذكاء اصطناعي محلي وسحابي آمن: مرونة تشغيل نماذج اللغة الكبيرة (LLMs) محلياً داخل المنشأة الطبية لحماية سرية المريض بالكامل.',
    'نظام إشعارات ذكي ومباشر: إرسال تنبيهات لحظية للأطباء والمرضى بأي تغيير في حالة الحجوزات أو طلبات التعديل.'
  ], color);

  addSectionSlide(prs, 'رؤيتنا للمستقبل', color);

  addContentSlide(prs, 'رؤيتنا لمستقبل الرعاية الصحية الذكية', [
    'عيادة AI هي الخطوة القادمة نحو رقمنة القطاع الصحي في العالم العربي بالكامل.',
    'حل جاهز ومثبت يعالج مشاكل التنسيق والتشغيل المالي والإداري للمجموعات الطبية والمستوصفات.',
    'للتواصل والدعم الفني: support@3yada.ai',
    'الموقع الرسمي للمنصة: www.3yada.ai'
  ], color);

  addThankYouSlide(prs, color);

  prs.writeFile({ fileName: path.join(OUT_DIR, 'presentation-overview.pptx') });
}

// ====================================================
// PATIENT PRESENTATION
// ====================================================
function genPatient(color) {
  const prs = new PptxGenJS();
  prs.defineLayout({ name: 'WIDE', width: 10, height: 5.625 });
  prs.layout = 'WIDE';

  addTitleSlide(prs, 'منصة المريض', '3yada AI Clinic — عيادة AI\nمساعدك الطبي الذكي لتبسيط الرعاية', color);
  
  addTocSlide(prs, [
    'مقدمة عن المنصة', 
    'الشاشة الترحيبية والتوجيه', 
    'تسجيل الدخول وإنشاء حساب', 
    'الصفحة الرئيسية وأقسامها', 
    'الاستشارة الذكية (AI Chat)', 
    'الملخص الطبي للمريض', 
    'فلاتر اختيار الطبيب المناسب', 
    'تأكيد المواعيد وحجوزاتي', 
    'سجل الاستشارات السابقة', 
    'الملف الشخصي والتأمين'
  ], color);
  
  addSectionSlide(prs, 'مقدمة عن المنصة', color);
  
  addContentSlide(prs, 'مقدمة عن المنصة', [
    'عيادة AI — منصة طبية ذكية تعمل بالذكاء الاصطناعي التوليدي لخدمة المرضى باللغة العربية.',
    'استشارة فورية لتحليل الأعراض بدقة بالاعتماد على أسئلة تفاعلية ذكية.',
    'توليد ملخص طبي منظم يوضح الشكوى الرئيسية وشدة الأعراض لمشاركته مع طبيبك.',
    'توجيه فوري للتخصص الأنسب لتقليل التردد والتشتت لدى المرضى.',
    'فلترة ذكية للأطباء حسب التخصص المقترح، المدينة، وشركات التأمين المقبولة.',
    'حجز المواعيد وإرسال طلبات تعديل الأوقات ومتابعتها رقمياً بشكل كامل.'
  ], color);
  
  addSectionSlide(prs, 'الشاشة الترحيبية وتجربة الدخول', color);
  
  addFourCardGridSlide(prs, 'الشاشة الترحيبية وبطاقات المزايا', [
    { icon: '🩺', title: 'فحص الأعراض الذكي', desc: 'محادثة تفاعلية بالعامية أو الفصحى لتشخيص أولي وتصنيف الأعراض.' },
    { icon: '📋', title: 'تقرير طبي جاهز', desc: 'ملخص طبي احترافي يتم توليده تلقائياً لتسليمه للطبيب لتوفير وقت الكشف.' },
    { icon: '🎯', title: 'التوجيه الذكي للتخصص', desc: 'تحديد التخصص المناسب لحالة المريض بناءً على تحليل الأعراض.' },
    { icon: '📅', title: 'حجز فوري مباشر', desc: 'تسهيل الوصول لأفضل الأطباء المتاحين وحجز موعد بضغطة زر واحدة.' }
  ], color);

  addScreenshotSlide(prs, 'الشاشة الترحيبية', 'patient-welcome', color, 'الشاشة الترحيبية التي يقابلها المريض');

  addTableSlide(prs, 'تسجيل الدخول وإنشاء حساب', ['الإجراء', 'الخطوات'], [
    ['تسجيل دخول', 'البريد الإلكتروني ← كلمة المرور ← "دخول"'],
    ['حساب جديد', '"تسجيل جديد" ← الاسم ← البريد ← كلمة المرور ← "تسجيل"'],
    ['روابط سريعة بالصفحة', 'زر دخول الأطباء (🩺) وزر دخول المشرفين (🔐) للتبديل بين المنصات بسهولة.']
  ], color);

  addScreenshotSlide(prs, 'واجهة تسجيل الدخول', 'patient-login', color, 'صفحة تسجيل دخول المريض');
  
  addSectionSlide(prs, 'الصفحة الرئيسية وتجربة المستخدم', color);
  
  addFourCardGridSlide(prs, 'الصفحة الرئيسية للمريض', [
    { icon: '🩺', title: 'بدء استشارة جديدة', desc: 'زر محوري للبدء بالتحدث مع المساعد الطبي الذكي لشرح حالتك الصحية.' },
    { icon: '📋', title: 'سجل الاستشارات', desc: 'تصفح كافة استشاراتك ومحادثاتك السابقة مع الـ AI وملخصاتها الطبية.' },
    { icon: '📅', title: 'جدول مواعيدي', desc: 'متابعة المواعيد القادمة، حالتها (مؤكدة، معلقة)، وطلب تعديلها.' },
    { icon: '👤', title: 'تعديل الملف الشخصي', desc: 'تحديث بياناتك الطبية مثل تاريخ الميلاد، الجنس، ونوع التأمين الصحي.' }
  ], color);

  addScreenshotSlide(prs, 'الصفحة الرئيسية', 'patient-home', color, 'الصفحة الرئيسية للمريض بعد تسجيل الدخول');
  
  addSectionSlide(prs, 'مراحل الاستشارة الطبية (AI Chat)', color);
  
  addContentSlide(prs, 'الاستشارة الذكية — واجهة المحادثة', [
    'حوار طبي آمن وتفاعلي باللغة العربية والعاميات يراعي سهولة الاستخدام.',
    'إمكانية رفع حتى 5 ملفات (صور أو PDF) بحجم أقصى 10 ميجابايت للتحليل الفوري (مثل التحاليل والتقارير).',
    'AI يجمع الأعراض، مدتها، ومستوى خطورتها، ويطرح بحد أقصى سؤالين للتوضيح لتجنب إرهاق المريض.',
    'تنبيهات فورية وبارزة في حال وجود أعراض تدل على حالة طارئة توجه المريض فوراً لطلب الإسعاف 123.',
    'زر "إنهاء الاستشارة" متوفر دائماً عندما يكتفي المريض بالنقاش ويرغب بالانتقال للملخص الطبي.'
  ], color);

  addScreenshotSlide(prs, 'واجهة المحادثة مع AI', 'patient-chat', color, 'محادثة تفاعلية ذكية لتحليل الأعراض');
  
  addSectionSlide(prs, 'الملخص الطبي واختيار الطبيب', color);
  
  addContentSlide(prs, 'الملخص الطبي للمريض', [
    'شكوى المريض الرئيسية: ملخص مكثف للمشكلة الصحية.',
    'الأعراض المستخلصة: قائمة منظمة لجميع الأعراض التي ذكرها المريض.',
    'المدة الزمنية ومستوى الخطورة: تصنيف الأعراض (منخفضة، متوسطة، عالية، طوارئ) لتحديد الإجراء المناسب.',
    'التوجيه الطبي المقترح: قائمة بالتخصصات الموصى بزيارتها.',
    'تقرير الطبيب الاحترافي: تقرير مكتوب بلغة طبية رصينة يسهل على الطبيب قراءتها لتقليص زمن الكشف.'
  ], color);
  
  addContentSlide(prs, 'فلاتر واختيار الطبيب الأنسب', [
    'التوجيه التلقائي: يتم فلترة الأطباء فوراً حسب التخصص المقترح من الذكاء الاصطناعي.',
    'البحث الجغرافي: تحديد الأطباء في المدينة التي ينتمي إليها المريض.',
    'فلترة التأمين الصحي: إظهار الأطباء المقبولين لدى شركة التأمين الخاصة بالمريض.',
    'بطاقة الطبيب: تحتوي على تفاصيل الطبيب (المستشفى، رسوم الكشف، التقييم، وسنوات الخبرة).',
    'إجراء الحجز: تحديد يوم ووقت الموعد من الأيام الخمسة القادمة بضغطة زر واحدة.'
  ], color);
  
  addSectionSlide(prs, 'إدارة الحجوزات والملف الشخصي', color);
  
  addContentSlide(prs, 'تأكيد الحجز ومتابعة المواعيد', [
    'شاشة تأكيد الحجز: تظهر فور انتهاء الحجز بنجاح مع كود الحجز الفريد وتفاصيل الطبيب والمريض.',
    'حالات المواعيد: (⏳ معلق - في انتظار قبول العيادة) ، (✅ مؤكد - تم اعتماده) ، (❌ مرفوض - مع إشعار بالسبب) ، (✔️ مكتمل - تمت الزيارة بنجاح).',
    'تعديل المواعيد: إمكانية إرسال طلب تعديل للموعد إلى الطبيب تشمل الموعد البديل والاسم والهاتف.',
    'خرائط جوجل: رابط مباشر لموقع المستشفى أو العيادة الجغرافي لتسهيل الوصول.'
  ], color);

  addScreenshotSlide(prs, 'حجوزاتي وإدارة المواعيد', 'patient-calendar', color, 'شاشة تتبع المواعيد وطلب التعديل');

  addContentSlide(prs, 'سجل الاستشارات والملف الشخصي', [
    'سجل الاستشارات: أرشيف متكامل يعرض الجلسات السابقة وتفاصيل محادثات AI مع إمكانية عرض التقرير الطبي والحجوزات المرتبطة بكل جلسة.',
    'الملف الشخصي: إدارة الاسم، الهاتف، تاريخ الميلاد، الجنس، والشركة التأمينية وتحديثها بمرونة لربطها بملف الطبيب.',
    'أمان البيانات: تشفير البيانات وحمايتها لضمان سرية محادثات المرضى بالكامل.'
  ], color);

  addScreenshotSlide(prs, 'الملف الشخصي للمريض', 'patient-profile', color, 'بيانات المريض والتأمين الصحي');
  
  addThankYouSlide(prs, color);

  prs.writeFile({ fileName: path.join(OUT_DIR, 'presentation-patient.pptx') });
}

// ====================================================
// DOCTOR PRESENTATION
// ====================================================
function genDoctor(color) {
  const prs = new PptxGenJS();
  prs.defineLayout({ name: 'WIDE', width: 10, height: 5.625 });
  prs.layout = 'WIDE';

  addTitleSlide(prs, 'منصة الطبيب', '3yada AI Clinic — عيادة AI\nلوحة التحكم الذكية ورقمنة العيادات للأطباء', color);
  
  addTocSlide(prs, [
    'مقدمة عن منصة الأطباء', 
    'التسجيل وتوثيق حساب الطبيب', 
    'تسجيل الدخول للمنصة', 
    'لوحة التحكم الرئيسية (Dashboard)', 
    'إدارة المواعيد اليومية والحالات', 
    'ملفات المرضى والسجل الطبي EMR', 
    'إصدار الوصفات الطبية الرقمية', 
    'الإدارة المالية لعيادتك', 
    'مراجعة ملخصات AI للمرضى', 
    'الباقات وتجربة الاشتراك والملف الشخصي'
  ], color);
  
  addSectionSlide(prs, 'مقدمة عن منصة الأطباء', color);
  
  addContentSlide(prs, 'مقدمة عن منصة الأطباء', [
    'منصة عيادة AI للأطباء هي الحل الرقمي المتكامل لإدارة الجوانب الطبية والمالية والتشغيلية بالعيادة.',
    'تمكين الطبيب من استقبال مواعيد المرضى المحولين تلقائياً وتأكيدها أو رفضها أو طلب تعديلها بمرونة.',
    'عرض ملخصات الأعراض المجهزة مسبقاً من الذكاء الاصطناعي للمريض للبدء فوراً بفحص الحالة.',
    'سجل طبي رقمي EMR يبسط تدوين البيانات وتصفح الزيارات السابقة للمرضى.',
    'بناء وإرسال وصفات طبية رقمية (الروشتات) متوافقة وصديقة للمريض والصيدليات.',
    'دفتر حسابات مالي لحظي يوضح مداخيل العيادة ومصروفاتها ونوعية الدفع (إلكتروني أو نقدي).'
  ], color);
  
  addSectionSlide(prs, 'التسجيل وتجربة الدخول', color);
  
  addContentSlide(prs, 'إنشاء الحساب وتوثيقه', [
    'نموذج تسجيل الطبيب: إدخال الاسم، التخصص، المستشفى، المدينة، المنطقة، الهاتف، والنبذة التعريفية ورسوم الكشف.',
    'التراخيص والتحقق: رفع صورة بطاقة الهوية الوطنية ورخصة مزاولة المهنة الطبية الصادرة عن وزارة الصحة لضمان أمان المنصة.',
    'مراجعة وتفعيل الحساب: يقوم المشرف العام بتدقيق المستندات وتفعيل الحساب خلال 24 ساعة كحد أقصى لمنح الطبيب الصلاحيات.'
  ], color);

  addScreenshotSlide(prs, 'صفحة تسجيل طبيب جديد', 'doctor-register', color, 'نموذج التسجيل ورفع التراخيص الطبية');
  addScreenshotSlide(prs, 'تسجيل دخول الأطباء', 'doctor-login', color, 'واجهة تسجيل دخول الطبيب للوحة التحكم');

  addSectionSlide(prs, 'لوحة التحكم والعمليات اليومية', color);
  
  addFourCardGridSlide(prs, 'شاشة Dashboard الرئيسية للطبيب', [
    { icon: '👥', title: 'إحصائيات سريعة للعيادة', desc: 'إظهار إجمالي المرضى، ومواعيد اليوم المجدولة، وإيرادات الشهر المالية، والمواعيد المعلقة.' },
    { icon: '📅', title: 'جدول مواعيد اليوم', desc: 'قائمة بالمواعيد المجدولة لليوم الحالي للبدء الفوري بالاستدعاء والكشف.' },
    { icon: '📋', title: 'الملخصات الطبية المستلمة', desc: 'قائمة بأحدث ملخصات الأعراض المرسلة من الذكاء الاصطناعي لمرضاك لقراءتها مسبقاً.' },
    { icon: '⚡', title: 'إجراءات سريعة وفورية', desc: 'أزرار سريعة ومحورية لإضافة مريض يدوياً بالعيادة أو تسجيل معاملة مالية سريعة.' }
  ], color);

  addSectionSlide(prs, 'إدارة مواعيد وحالات المرضى', color);
  
  addTableSlide(prs, 'إدارة المواعيد — الحالات والعمليات', ['الحالة', 'الخيارات المتاحة للطبيب', 'الأثر بالنظام'], [
    ['⏳ معلق', 'قبول الموعد (✅) أو رفض الموعد (❌)', 'يتغير حالة الموعد لدى المريض مع إشعار'],
    ['🟠 طلب تعديل', 'قبول موعد المريض الجديد أو رفض التعديل', 'تعديل تفاصيل الموعد تلقائياً في التقويم'],
    ['✅ مؤكد', 'بدء الكشف ثم الضغط على إنهاء (✔️)', 'يتحول الموعد لمكتمل ويُدرج بالمالية والـ EMR'],
    ['✔️ مكتمل', 'تصفح الوصفة والتقرير المالي المصاحب', 'تسجيل المعاملة المالية وإتاحة تدوين الروشتة']
  ], color);

  addSectionSlide(prs, 'السجلات الطبية EMR والوصفات', color);
  
  addContentSlide(prs, 'السجل الطبي للمريض (EMR)', [
    'عرض قائمة مرضى العيادة والبحث بالاسم وتاريخ التسجيل بسهولة.',
    'تفاصيل المريض: تشمل معلومات الاتصال، النوع، العمر، والتأمين الصحي، والشكوى الأساسية.',
    'التاريخ الطبي: أرشيف مرتب تنازلياً لكافة الزيارات السابقة والتشخيصات والملخصات التي أُجريت.',
    'إجراءات المريض: كتابة وصفة طبية جديدة للزيارة الحالية وتعديل التاريخ المرضي العام.'
  ], color);
  
  addContentSlide(prs, 'الوصفات الطبية الرقمية (e-Prescription)', [
    'إصدار روشتة رقمية: واجهة سريعة لكتابة الدواء والجرعة المناسبة.',
    'تحديد التكرار والمدة: اختيار تكرار الدواء (مثال: مرتين يومياً) ومدته (مثال: 5 أيام).',
    'الحفظ التلقائي: تُحفظ الوصفة فوراً في ملف المريض وتكون متاحة له في حسابه.',
    'تقليل الخطأ البشري: الروشتات الرقمية واضحة ومقروءة للمريض والصيدلي لتجنب مشاكل الخطوط اليدوية.'
  ], color);

  addSectionSlide(prs, 'الإدارة المالية والاشتراكات', color);
  
  addContentSlide(prs, 'الإدارة المالية بالعيادة', [
    'لوحة مالية مركزية: إجمالي الإيرادات الكلية للعيادة مع فرزها حسب طريقة الدفع (كاش / إلكتروني).',
    'عدد الفواتير المصدرة: تتبع إجمالي المعاملات المالية المكتملة.',
    'سجل الإيرادات: جدول يوضح تاريخ المعاملة، واسم المريض، والمبلغ المستحق، وطريقة السداد.',
    'التسجيل التلقائي: يتم تحويل الكشف المكتمل تلقائياً لمعاملة مالية دون الحاجة لتسجيلها يدوياً.'
  ], color);

  addTableSlide(prs, 'الباقات واشتراكات الأطباء بالمنصة', ['الباقة', 'سعر الاشتراك شهرياً', 'الحد الأقصى للمرضى النشطين', 'المزايا'], [
    ['🆓 مجانية (Free)', '0 ج.م', '10 مرضى شهرياً', 'الميزات الأساسية والتقويم المحدود'],
    ['🔵 أساسية (Standard)', '99 ج.م', '50 مريضاً نشطاً شهرياً', 'إدارة EMR كاملة والوصفات الطبية والمالية'],
    ['🟣 مميزة (Premium)', '199 ج.م', 'غير محدود', 'كامل مزايا النظام + دعم أولوي + شارة موصى به']
  ], color);

  addContentSlide(prs, 'فترة التجربة والملف الشخصي', [
    'فترة تجريبية مجانية: يحصل الطبيب على 3 أيام كاملة في الباقة المميزة فور التسجيل لاختبار المنظومة.',
    'عداد تنازلي: يظهر مؤشر الأيام التجريبية المتبقية في لوحة التحكم بشكل مستمر.',
    'تعديل الملف الشخصي: إدارة شركات التأمين المقبولة في عيادتك، وتغيير رسوم الكشف، والتخصص وتفاصيل المستشفى.'
  ], color);

  addThankYouSlide(prs, color);

  prs.writeFile({ fileName: path.join(OUT_DIR, 'presentation-doctor.pptx') });
}

// ====================================================
// ADMIN PRESENTATION
// ====================================================
function genAdmin(color) {
  const prs = new PptxGenJS();
  prs.defineLayout({ name: 'WIDE', width: 10, height: 5.625 });
  prs.layout = 'WIDE';

  addTitleSlide(prs, 'منصة المشرف (Admin)', '3yada AI Clinic — عيادة AI\nلوحة الرقابة والتحكم المركزية لإدارة المنظومة بالكامل', color);
  
  addTocSlide(prs, [
    'مقدمة عن منصة المشرفين', 
    'تسجيل الدخول وحماية الحساب', 
    'أقسام الشريط الجانبي', 
    'لوحة التحكم الرئيسية والإحصائيات', 
    'رقابة محادثات المرضى مع AI', 
    'إدارة وتوثيق حسابات الأطباء', 
    'استيراد وتصدير الأطباء (CSV)', 
    'إشراف المواعيد والاشتراكات والمشرفين', 
    'الأسئلة الشائعة والمميزات الفنية'
  ], color);
  
  addSectionSlide(prs, 'مقدمة عن منصة المشرفين', color);
  
  addContentSlide(prs, 'مقدمة عن منصة المشرفين', [
    'منصة المشرف هي العقل الإداري والرقابي المركزي الذي يتحكم في عيادة AI بالكامل.',
    'إحصائيات لحظية وتحليلية لأداء المنظومة التشغيلي والمالي في الوقت الفعلي.',
    'إدارة حسابات الأطباء ومراجعة مستنداتهم وتراخيصهم الطبية للتوثيق أو التعليق.',
    'الرقابة على المحادثات الطبية التي يجريها المرضى مع الذكاء الاصطناعي لضمان الجودة والسلامة.',
    'إدارة الباقات والاشتراكات المالية والتحكم بالصلاحيات الإدارية وتوزيع المهام.',
    'أدوات لتبادل البيانات كاستيراد وتصدير قوائم الأطباء والتكامل مع الأنظمة الأخرى.'
  ], color);
  
  addSectionSlide(prs, 'تسجيل الدخول وإعدادات التحكم', color);
  
  addContentSlide(prs, 'تسجيل الدخول وحماية الحساب', [
    'دخول المشرف: عبر الرابط المخصص "دخول المشرف" من الواجهة الرئيسية.',
    'البيانات الافتراضية للتثبيت الأول: البريد (admin@3yada.ai) ، كلمة المرور (admin123).',
    '⚠️ تنبيه أمني: يفرض النظام تغيير كلمة المرور الافتراضية فور الدخول الأول لحماية البيانات الطبية للمنصة.'
  ], color);

  addScreenshotSlide(prs, 'تسجيل دخول المشرفين', 'admin-login', color, 'واجهة تسجيل دخول المشرف المركزي للمنصة');

  addTableSlide(prs, 'أقسام الشريط الجانبي بلوحة التحكم', ['القسم', 'الأيقونة', 'الوظيفة الرئيسية بالمنصة'], [
    ['لوحة التحكم', '📊', 'عرض الإحصائيات الحية وأرقام الأداء المالي والتشغيلي'],
    ['المحادثات', '💬', 'مراجعة وتدقيق حوارات المرضى مع الذكاء الاصطناعي والمرفقات'],
    ['الأطباء', '👨‍⚕️', 'توثيق وتفعيل وتعديل وحذف حسابات الأطباء المسجلين'],
    ['المرضى', '👥', 'متابعة حسابات المرضى وتعديل بياناتهم وتغيير كلمات المرور'],
    ['المواعيد', '📅', 'الإشراف على الحجوزات وإدارتها وتغيير حالاتها نيابة عن العيادات'],
    ['الاشتراكات', '⭐', 'إدارة باقات الأطباء وتحديد فترات التفعيل ونهاية الاشتراك'],
    ['المشرفون', '🔐', 'إضافة وتعديل صلاحيات وحذف حسابات المشرفين الآخرين']
  ], color);

  addSectionSlide(prs, 'الإحصائيات والرقابة الحية', color);
  
  addFourCardGridSlide(prs, 'لوحة التحكم الرئيسية والبيانات الحية', [
    { icon: '👥', title: 'مراقبة المرضى والمشرفين', desc: 'تتبع أعداد المستخدمين المسجلين بالكامل بالمنصة وأعداد المشرفين النشطين بمستويات صلاحياتهم.' },
    { icon: '👨‍⚕️', title: 'إحصائيات الأطباء والمواعيد', desc: 'إظهار إجمالي الأطباء ونسبة الموثقين منهم، وإجمالي المواعيد المحجوزة ونسبة المعلق منها.' },
    { icon: '💰', title: 'مراقبة الإيرادات المشتركة', desc: 'تتبع إجمالي إيرادات الكشوفات للأطباء، ومداخيل المنصة الإجمالية المتأتية من اشتراكات الباقات.' },
    { icon: '💬', title: 'نشاط الذكاء الاصطناعي', desc: 'مراقبة إجمالي المحادثات الجارية مع AI ومرفقاتها لتقييم استهلاك النموذج وكفاءته.' }
  ], color);

  addScreenshotSlide(prs, 'لوحة إحصائيات المشرف', 'admin-dashboard', color, 'شاشة الإحصائيات المركزية لأداء النظام بالكامل');
  
  addSectionSlide(prs, 'إدارة المحادثات وجودة AI', color);
  
  addContentSlide(prs, 'مراقبة حوارات AI لضمان الجودة والأمان', [
    'تتبع محادثات AI: تصفح حوارات المرضى مع الذكاء الاصطناعي التوليدي لمكافحة سوء الاستخدام ومراقبة الجودة الطبية للردود.',
    'عرض المجموعات: فلترة المحادثات حسب المستخدم لمعرفة عدد جلسات كل مريض ومتابعة الحالات بشكل مجمع.',
    'عرض التفاصيل: عرض الرسائل المتبادلة بالكامل، والملفات المرفوعة (الصور والـ PDFs) وتواريخ بدء وانتهاء المحادثات.',
    'تأمين وسرية المعلومات: متاح فقط للمشرفين المصرح لهم بمراقبة الأداء لمنع تسرب بيانات المرضى الحساسة.'
  ], color);

  addScreenshotSlide(prs, 'مراجعة المحادثات للـ AI', 'admin-conversations', color, 'شاشة مراجعة حوارات المرضى مع المساعد الطبي');

  addSectionSlide(prs, 'إدارة حسابات الأطباء والبيانات', color);
  
  addContentSlide(prs, 'إدارة الأطباء وتدقيق التراخيص', [
    'توثيق الطبيب: تفعيل شارة "✅ موثّق" بحساب الطبيب بعد تدقيق رخصة مزاولة المهنة المرفوعة.',
    'الإجراءات المتاحة: عرض تفاصيل الحساب الكاملة والوثائق المرفقة، تعديل بيانات الطبيب، تغيير الباقة، وتغيير كلمة المرور، أو الحذف التام.',
    'أداة الاستيراد (CSV Import): إمكانية استيراد قوائم أطباء ضخمة دفعة واحدة بملف CSV مع دعم الرؤوس بالعربية والإنجليزية.',
    'أداة التصدير (CSV Export): تصدير كافة بيانات الأطباء وصلاحياتهم بملف Excel متوافق بالكامل بترشيح UTF-8 مع BOM.'
  ], color);

  addScreenshotSlide(prs, 'إدارة حسابات الأطباء', 'admin-doctors', color, 'شاشة التحكم بحسابات الأطباء المسجلين وتوثيقهم');
  
  addSectionSlide(prs, 'المرضى والمواعيد والاشتراكات', color);
  
  addContentSlide(prs, 'إدارة المرضى والمواعيد والاشتراكات', [
    'قائمة المرضى: تصفح المرضى والاطلاع على تفاصيل محادثاتهم ومواعيدهم بالكامل وتصفير كلمات المرور عند نسيانها.',
    'رقابة المواعيد: فلترة وتعديل وحذف المواعيد وتغيير حالاتها (معلق، مؤكد، مكتمل، مرفوض) لتنسيق العمل.',
    'إدارة الاشتراكات: التحكم بباقات الأطباء النشطة (مجاني، أساسي، مميز) وتخصيص تاريخ انتهاء الاشتراك بدقة وإدارتها مالياً.',
    'حسابات المشرفين: إضافة مشرفين جدد، وتحديد صلاحياتهم (مشرف عام كامل الصلاحيات - مشرف محدود الصلاحيات) لمشاركة مهام الإدارة.'
  ], color);

  addScreenshotSlide(prs, 'إدارة المواعيد المركزية', 'admin-appointments', color, 'لوحة التحكم بجميع مواعيد المرضى المسجلة بالنظام');
  
  addThankYouSlide(prs, color);

  prs.writeFile({ fileName: path.join(OUT_DIR, 'presentation-admin.pptx') });
}

// ====================================================
// PLATFORMS PRESENTATION (Web / Android / iOS)
// ====================================================
function genPlatforms(color) {
  const prs = new PptxGenJS();
  prs.defineLayout({ name: 'WIDE', width: 10, height: 5.625 });
  prs.layout = 'WIDE';

  addTitleSlide(prs, 'منصة عيادة AI', 'ثلاث منصات متكاملة — Web · Android · iOS\nتجربة موحدة عبر جميع الأجهزة', color);

  addTocSlide(prs, [
    'النظام الأساسي: الويب (PWA)',
    'تطبيق Android',
    'تطبيق iOS',
    'معمارية Shared Code',
    'قاعدة البيانات والتخزين',
    'مقارنة المنصات الثلاثة',
    'إستراتيجية التطوير المتقاطع (Cross-Platform)',
    'خارطة الطريق المستقبلية'
  ], color);

  addSectionSlide(prs, 'النظام الأساسي: الويب (PWA)', color);

  addContentSlide(prs, 'ويب — Progressive Web App (PWA)', [
    'تقنية PWA: تطبيق ويب تدريجي يعمل كتطبيق أصلي على أي متصفح حديث مع دعم كامل للعربية RTL.',
    'Vite + React 19: بناء سريع مع hot-reload فوري وتقسيم أكواد تلقائي لتحسين أداء التحميل.',
    'Tailwind CSS v4: تصميم عصري متجاوب بألوان مخصصة وخط IBM Plex Sans Arabic لدعم الطباعة العربية.',
    'Google Gemini API: دمج ذكاء اصطناعي توليدي متطور للاستشارات الطبية والتحليل الذكي.'
  ], color);

  addFourCardGridSlide(prs, 'مميزات منصة الويب (PWA)', [
    { icon: '🌐', title: 'دعم كامل للمتصفحات', desc: 'يعمل على Chrome, Firefox, Safari, Edge دون الحاجة لأي تثبيت.' },
    { icon: '📱', title: 'قابل للتثبيت (Installable)', desc: 'يمكن تثبيته كتطبيق سطح مكتب أو موبايل من المتصفح مباشرة.' },
    { icon: '⚡', title: 'أداء عالي وسرعة فائقة', desc: 'Vite + React Suspense + كود مجزأ لتحميل سريع وتجربة سلسة.' },
    { icon: '🔒', title: 'تشفير HTTPS إجباري', desc: 'اتصالات آمنة تماماً مع تشفير البيانات بين المتصفح والخادم.' }
  ], color);

  addSectionSlide(prs, 'تطبيق Android', color);

  addContentSlide(prs, 'Android — تطبيق أصلي باستخدام Capacitor', [
    'Capacitor 8: إطار عمل لتغليف تطبيق الويب كتطبيق Android أصلي (Native) مع الوصول الكامل لواجهات الجهاز.',
    'Android SDK: بناء باستخدام Gradle مع دعم Android API 24+ (تغطية 98% من الأجهزة الحديثة).',
    'الوصول لميزات الجهاز: كاميرا، ملفات، إشعارات، GPS، تخزين محلي عبر @capacitor/core APIs.',
    'متجر Google Play: جاهز للنشر على Google Play Store مع ملف APK موقّع للإصدارات المختلفة.'
  ], color);

  addFourCardGridSlide(prs, 'مميزات تطبيق Android', [
    { icon: '📸', title: 'كاميرا وملفات', desc: 'تصوير المستندات والتحاليل ورفعها مباشرة من الكاميرا أو المعرض.' },
    { icon: '🔔', title: 'إشعارات لحظية (Push)', desc: 'إشعارات فورية للمرضى والأطباء عند تغيير حالة المواعيد والحجوزات.' },
    { icon: '📦', title: 'APK ثنائي (Debug/Release)', desc: 'إصدار تصحيح لأغراض التطوير وآخر موقّع للإنتاج على Google Play.' },
    { icon: '⚙️', title: 'مزامنة تامة مع السيرفر', desc: 'جميع البيانات متزامنة فوراً مع الخادم المركزي دون فقدان للمعلومات.' }
  ], color);

  addSectionSlide(prs, 'تطبيق iOS', color);

  addContentSlide(prs, 'iOS — تطبيق أصلي باستخدام Capacitor', [
    'Capacitor 8 iOS: تغليف تلقائي لتطبيق الويب كتطبيق iOS أصلي مع kotlin/swift bridge.',
    'Xcode + Swift: مشروع Xcode متكامل مع ملفات توقيع (Signing) ورفع إلى App Store Connect.',
    'دعم iPhone/iPad: تجربة محسّنة لجميع أحجام الشاشات مع دعم الوضع الأفقي والعمودي.',
    'App Store: جاهز للنشر على متجر Apple App Store مع جميع متطلبات Apple للتطبيقات الطبية.'
  ], color);

  addFourCardGridSlide(prs, 'مميزات تطبيق iOS', [
    { icon: '📱', title: 'تجربة iOS أصيلة', desc: 'الالتزام بتوجيهات Apple HIG (Human Interface Guidelines) لتجربة مستخدم سلسة.' },
    { icon: '🔄', title: 'مزامنة iCloud', desc: 'مزامنة البيانات عبر iCloud لتجربة موحدة بين أجهزة Apple المختلفة.' },
    { icon: '🔐', title: 'Face ID / Touch ID', desc: 'دعم المصادقة البيومترية لتسجيل الدخول الآمن والسريع للمرضى والأطباء.' },
    { icon: '🎯', title: 'أداء محسّن ARM64', desc: 'مُجمّع بشكل أصلي لمعالجات Apple Silicon لأداء فائق وسلاسة تامة.' }
  ], color);

  addSectionSlide(prs, 'معمارية Shared Code', color);

  addContentSlide(prs, 'معمارية Shared Code — 90% كود مشترك', [
    'الكود المشترك: كل الكود (React, TypeScript, Tailwind) مشترك بين Web، Android، iOS — كتابة واحدة، تشغيل ثلاثي.',
    'طبقة API موحدة: نفس واجهات API (api.ts, api-doctor.ts, api-admin.ts) تعمل دون تغيير على جميع المنصات.',
    'التصميم المتجاوب: Tailwind CSS + RTL يجعل الواجهة تتكيف تلقائياً مع جميع أحجام الشاشات واتجاهات الكتابة.',
    'فصل الكود: مكونات الويب (+10) هي نفسها مكونات الموبايل — لا ازدواجية ولا جهد إضافي للصيانة.'
  ], color);

  addTableSlide(prs, 'مقارنة المنصات الثلاثة', ['الميزة', 'Web (PWA)', 'Android', 'iOS'], [
    ['نظام البناء', 'Vite 6', 'Gradle + Capacitor', 'Xcode + Capacitor'],
    ['لغة البرمجة', 'TypeScript/React', 'TypeScript + Java Bridge', 'TypeScript + Swift Bridge'],
    ['متجر التطبيقات', 'متصفح + تثبيت PWA', 'Google Play Store APK', 'Apple App Store IPA'],
    ['API Level', 'أي متصفح حديث', 'Android API 24+', 'iOS 16+'],
    ['المصادقة', 'JWT + Token', 'JWT + Biometric', 'JWT + Face ID'],
    ['الإشعارات', 'Web Push API', 'FCM Push', 'APNs Push'],
    ['نسبة الكود المشترك', '100% (الأساس)', '~90%', '~90%'],
    ['التحديثات', 'فورية (تحديث ويب)', 'متجر Google Play', 'مراجعة Apple أولاً']
  ], color);

  addSectionSlide(prs, 'إستراتيجية Cross-Platform', color);

  addMetricsSlide(prs, 'مزايا استراتيجية Cross-Platform', [
    { number: '90%+', label: 'كود مشترك', desc: 'أكثر من 90% من قاعدة الكود مشتركة بين المنصات الثلاث مما يوفر وقت التطوير.' },
    { number: '3x', label: 'سرعة الإطلاق', desc: 'إطلاق المنصة على 3 متاجر (Web + Play + App Store) بنفس الجهد التقليدي لمنصة واحدة.' },
    { number: '60%+', label: 'توفير تكاليف', desc: 'تقليل تكاليف التطوير والصيانة بنسبة تزيد عن 60% مقارنة بفريق لكل منصة.' },
    { number: '100%', label: 'توحيد التجربة', desc: 'تجربة مستخدم موحدة ومتسقة تماماً عبر جميع المنصات والأجهزة.' }
  ], color);

  addContentSlide(prs, 'التكامل والنشر الموحد', [
    'Capacitor CLI: أداة سطر أوامر واحدة لمزامنة كل التغييرات مع Android و iOS (npx cap sync).',
    'أتمتة البناء: سكربتات بناء APK (debug/release) و IPA عبر سطر أوامر واحد في package.json.',
    'بيئة تطوير موحدة: npm run dev لتشغيل الويب و npx cap open android/ios لفتح المشاريع الأصلية.',
    'تحديثات فورية للويب: نشر التحديثات على الويب فورياً دون مراجعة متجر — مثالي للتحديثات العاجلة.'
  ], color);

  addThankYouSlide(prs, color);

  prs.writeFile({ fileName: path.join(OUT_DIR, 'presentation-platforms.pptx') });
}

// ====================================================
// MAIN RUN GENERATOR
// ====================================================
console.log('جارٍ إنشاء العروض التقديمية الاحترافية المحسنة...');
genOverview(COLORS.overview);
console.log('✅ presentation-overview.pptx (العرض التعريفي العام والمقنع)');
genPatient(COLORS.patient);
console.log('✅ presentation-patient.pptx (عرض المريض)');
genDoctor(COLORS.doctor);
console.log('✅ presentation-doctor.pptx (عرض الطبيب)');
genAdmin(COLORS.admin);
console.log('✅ presentation-admin.pptx (عرض المشرف)');
genPlatforms(COLORS.overview);
console.log('✅ presentation-platforms.pptx (المنصات الثلاث: Web/Android/iOS)');
console.log('تم إنشاء وتحديث جميع العروض التقديمية بنجاح في مجلد /guides !');
