import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_financial_pdf(user_name: str, email: str, prediction_data: dict) -> io.BytesIO:
    """
    Generates a professional, branded PDF financial report using ReportLab.
    Returns a BytesIO binary stream of the PDF file.
    """
    buffer = io.BytesIO()
    
    # Page setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles for Branded Look
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#4f46e5'), # Indigo
        alignment=0, # Left-aligned
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        name='SubTitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#4b5563'), # Gray-600
        spaceAfter=25
    )
    
    h1_style = ParagraphStyle(
        name='Heading1Style',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1e1b4b'), # Navy-900
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        name='BodyStyle',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1f2937'), # Gray-800
        spaceAfter=8
    )
    
    bold_body_style = ParagraphStyle(
        name='BoldBodyStyle',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    alert_style = ParagraphStyle(
        name='AlertStyle',
        parent=body_style,
        textColor=colors.HexColor('#047857') # Emerald-700
    )

    elements = []
    
    # --- HEADER / BRANDING ---
    elements.append(Paragraph("FINORA AI — FINANCIAL INTELLIGENCE REPORT", title_style))
    date_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    elements.append(Paragraph(f"Prepared for: <b>{user_name}</b> ({email}) | Generated on: {date_str}", subtitle_style))
    elements.append(Spacer(1, 10))
    
    # --- EXECUTIVE OVERVIEW SECTION ---
    elements.append(Paragraph("Executive Financial Overview", h1_style))
    elements.append(Paragraph(
        "This intelligence report provides an analytical review of your current cash flow parameters, "
        "evaluates your financial health score, and provides a forecasted savings trajectory using the "
        "Finora AI predictive models. Below is a summary of your active metrics:",
        body_style
    ))
    
    # Extract values
    inputs = prediction_data.get("input_data", {})
    preds = prediction_data.get("predictions", {})
    
    income = float(inputs.get("Income", 0.0))
    expense = float(inputs.get("Expense", 0.0))
    budget = float(inputs.get("Budget", 0.0))
    investment = float(inputs.get("Investment", 0.0))
    
    pred_savings = float(preds.get("predicted_savings", 0.0))
    health_score = float(preds.get("financial_health_score", 50.0))
    budget_util = float(preds.get("budget_utilization", 0.0))
    wealth_cat = str(preds.get("future_wealth_category", "Medium"))
    recommendation = str(preds.get("investment_recommendation", ""))
    
    # Summary Table Data
    data_summary = [
        [Paragraph("<b>Metric</b>", bold_body_style), Paragraph("<b>Active Value</b>", bold_body_style), Paragraph("<b>Key Indicator Status</b>", bold_body_style)],
        [Paragraph("Monthly Income", body_style), f"₹{income:,.2f}", "Primary cash flow source"],
        [Paragraph("Monthly Expenses", body_style), f"₹{expense:,.2f}", f"Ratio: {preds.get('expense_ratio', 0):.1f}% of income"],
        [Paragraph("Active Monthly Budget", body_style), f"₹{budget:,.2f}", f"Utilization: {budget_util:.1f}%"],
        [Paragraph("Predicted Monthly Savings", body_style), f"₹{pred_savings:,.2f}", f"Savings Rate: {preds.get('savings_rate', 0):.1f}%"],
        [Paragraph("Financial Health Score", body_style), f"{health_score}%", "Excellent (>=70%) | Good (>=50%)"],
        [Paragraph("Future Wealth Category", body_style), wealth_cat, "Based on 1-Year savings forecast"]
    ]
    
    t_summary = Table(data_summary, colWidths=[2.0*inch, 2.0*inch, 3.0*inch])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e0e7ff')), # Light indigo header
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1e1b4b')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ('TOPPADDING', (0,1), (-1,-1), 6),
    ]))
    
    elements.append(t_summary)
    elements.append(Spacer(1, 15))
    
    # --- MACHINE LEARNING PREDICTIVE FORECASTS ---
    elements.append(Paragraph("Machine Learning Predictive Insights & Forecasts", h1_style))
    elements.append(Paragraph(
        "Finora's pre-trained Random Forest ML Model analyzes your financial markers (including demographic patterns, "
        "risk score, and category expenses) to forecast future savings compounding. Here is your 5-year savings projection:",
        body_style
    ))
    
    forecast_data = preds.get("savings_forecast", [])
    if not forecast_data:
        # Fallback values if forecast array is empty
        forecast_data = [
            {"year": "Current", "savings": pred_savings},
            {"year": "Year 1", "savings": pred_savings * 12 * 1.05},
            {"year": "Year 2", "savings": pred_savings * 12 * 2.15},
            {"year": "Year 3", "savings": pred_savings * 12 * 3.35},
            {"year": "Year 4", "savings": pred_savings * 12 * 4.62},
            {"year": "Year 5", "savings": pred_savings * 12 * 6.00}
        ]
        
    data_forecast = [
        [Paragraph("<b>Time Frame</b>", bold_body_style), Paragraph("<b>Forecasted Cumulative Savings</b>", bold_body_style)]
    ]
    for row in forecast_data:
        data_forecast.append([row["year"], f"₹{row['savings']:,.2f}"])
        
    t_forecast = Table(data_forecast, colWidths=[3.0*inch, 4.0*inch])
    t_forecast.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')), # Gray header
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
    ]))
    
    elements.append(t_forecast)
    elements.append(Spacer(1, 15))
    
    # --- STRATEGIC ADVISORY SECTION ---
    elements.append(Paragraph("Strategic AI Recommendations", h1_style))
    elements.append(Paragraph(f"<b>Investment Allocation Recommendation:</b>", bold_body_style))
    elements.append(Paragraph(recommendation, body_style))
    
    recom_inv = float(preds.get("recommended_investment", pred_savings * 0.30))
    em_fund = float(preds.get("emergency_fund", expense * 6))
    
    elements.append(Paragraph(
        f"• <b>Emergency Fund Target</b>: An emergency buffer of 6 months expenses is set at <b>₹{em_fund:,.2f}</b>. "
        "Prioritize filling this liquid account before executing high-yield allocations.\n"
        f"<br/>• <b>Monthly Investment SIP Goal</b>: Invest <b>₹{recom_inv:,.2f}</b> monthly. "
        "We recommend setting up an automated transfer to mutual funds, bonds, or equity portfolios immediately.",
        alert_style
    ))
    
    elements.append(Spacer(1, 20))
    
    # --- FOOTER SIGN-OFF ---
    elements.append(Paragraph("<i>Disclaimer: Finora AI provides analysis based on statistical modeling of historical dataset distributions. These recommendations are educational and should not replace accredited professional financial advisory services.</i>", subtitle_style))
    
    # Build Document
    doc.build(elements)
    buffer.seek(0)
    return buffer
