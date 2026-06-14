// 1. Request Received Emails (Customer to Service)
export const requestReceivedReimbursementTemplate = ({ customerName }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>We have received your request for reimbursement and we will revert to you within the next 48 working hours.</p>
  <br/>
  <p>Claims Team</p>
</div>
`;

export const requestReceivedDiagnosticTemplate = ({ customerName }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>We have received your request for Diagnostic Tests and we will revert to you within the next 4 working hours.</p>
  <br/>
  <p>Diagnostic Team</p>
</div>
`;

export const requestReceivedMedicineTemplate = ({ customerName }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>We have received your request for Medicines and we will revert to you within the next 4 working hours.</p>
  <br/>
  <p>Pharmacy Team</p>
</div>
`;

export const requestReceivedCaretakerTemplate = ({ customerName }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>We have received your request for Caretaker Services and we will revert to you within the next 24 to 48 hours working hours.</p>
  <br/>
  <p>Service Team</p>
</div>
`;

// 2. Services Rendered Emails (Reply to Customer)
export const serviceRenderedReimbursementTemplate = ({ customerName }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>We have Cleared your bill kindly check the updated reimbursement Logs and your Ewallet of healthMitraUS.com.</p>
  <br/>
  <p>Claims Team</p>
</div>
`;

export const serviceRenderedDiagnosticTemplate = ({ customerName, freeText }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>We have replied to your request for Diagnostic Tests Kindly cross check and reply back to us within 24 hours to service this request.</p>
  ${freeText ? `<p>${freeText}</p>` : ''}
  <br/>
  <p>Diagnostic Team</p>
</div>
`;

export const serviceRenderedMedicineTemplate = ({ customerName, freeText }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>We have replied to your request for Medicines Kindly cross check and reply back to us within 24 hours to service this request.</p>
  ${freeText ? `<p>${freeText}</p>` : ''}
  <br/>
  <p>Pharmacy Team</p>
</div>
`;

export const serviceRenderedCaretakerTemplate = ({ customerName }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>We have replied to your request for Caretaker and nursing Services Kindly cross check and reply back to us within 24 hours to service this request.</p>
  <br/>
  <p>Service Team</p>
</div>
`;

// 3. Bill Reimbursement (Approved)
export const billReimbursementOpdTemplate = ({ customerName, amount, percentage, taxAmount }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>We have undergone investigations on the said refund of yours towards OPD charges. As per telephonic Conversation/Email with our Claims Team Member we are supposed to do a Refund of INR ${amount}/- towards service OPD Refund to your account without TAX.</p>
  <p>OPD cleared at ${percentage}% Less 18% Tax inr ${taxAmount}</p>
  <p>Request you to kindly use HealthMitra verified labs and Get between 30% to 50% Discount of tests.</p>
  <p>Please Send bills within 30 days of Bill being acquired. Bills older than the same will not be entertained.</p>
  <p>Prescriptions are required for Clearance of Medicine bills.</p>
  <p>Emails over 10 MB don’t reach us kindly break the email down in parts.</p>
  <p>We are in the meantime requesting you for details so that the partial service refund for the same may be initialized from our end towards Service Delivery.</p>
  
  <p><strong>Details Required:</strong></p>
  <p>In below mentioned Format ONLY and In the Columns Mentioned Below ONLY</p>
  <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
    <tr>
      <th>Name of customer as in Bank Account.</th>
      <th>Name of Bank.</th>
      <th>Bank IFSC Code</th>
      <th>Bank Account Number.</th>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </table>
  <p>Also attached cheque copy as its mandatory now</p>
  <p>Sir, Bill clearance process usually takes 48 - 72 Working Hours at the maximum as per Our guidelines excluding Saturday and Sundays or national holidays. Request you to kindly revert back with the said details so that we may initiate refund as per our guidelines.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Claims Team HealthMitra</strong></p>
</div>
`;

export const billReimbursementTestTemplate = ({ customerName, amount, percentage, taxAmount }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>We have undergone investigations on the said refund of yours towards Diagnostic charges. As per telephonic Conversation/Email with our Claims Team Member we are supposed to do a Refund of INR ${amount}/- towards service Diagnostic Refund to your account without TAX.</p>
  <p>Diagnostics Tests cleared at ${percentage}% Less 18% Tax inr ${taxAmount} (kindly use our panel labs and get 30 to 50 % discount)</p>
  <p>kindly start using HealthMitra labs only from now on. Request you to kindly use HealthMitra verified labs and Get between 30% to 50% Discount of tests.</p>
  <p>Please Send bills within 30 days of Bill being acquired. Bills older than the same will not be entertained.</p>
  <p>Prescriptions are required for Clearance of Medicine bills.</p>
  <p>Emails over 10 MB don’t reach us kindly break the email down in parts.</p>
  <p>We are in the meantime requesting you for details so that the partial service refund for the same may be initialized from our end towards Service Delivery.</p>
  
  <p><strong>Details Required:</strong></p>
  <p>In below mentioned Format ONLY and In the Columns Mentioned Below ONLY</p>
  <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
    <tr>
      <th>Name of customer as in Bank Account.</th>
      <th>Name of Bank.</th>
      <th>Bank IFSC Code</th>
      <th>Bank Account Number.</th>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </table>
  <p>Also attached cheque copy as its mandatory now</p>
  <p>Sir, Bill clearance process usually takes 48 - 72 Working Hours at the maximum as per Our guidelines excluding Saturday and Sundays or national holidays. Request you to kindly revert back with the said details so that we may initiate refund as per our guidelines.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Claims Team HealthMitra</strong></p>
</div>
`;

export const billReimbursementMedicineTemplate = ({ customerName, amount, percentage, taxAmount }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>We have undergone investigations on the said refund of yours towards Medicines charges. As per telephonic Conversation/Email with our Claims Team Member we are supposed to do a Refund of INR ${amount}/- towards service Medicines Refund to your account without TAX.</p>
  <p>Medicines Cleared at ${percentage}% Less 18% Tax inr ${taxAmount} (kindly use HealthMitra panel Pharmacy and get 30% discount)</p>
  <p>Request you to kindly use HealthMitra verified labs and Get between 30% to 50% Discount of tests.</p>
  <p>Please Send bills within 30 days of Bill being acquired. Bills older than the same will not be entertained.</p>
  <p>Prescriptions are required for Clearance of Medicine bills.</p>
  <p>Emails over 10 MB don’t reach us kindly break the email down in parts.</p>
  <p>We are in the meantime requesting you for details so that the partial service refund for the same may be initialized from our end towards Service Delivery.</p>
  
  <p><strong>Details Required:</strong></p>
  <p>In below mentioned Format ONLY and In the Columns Mentioned Below ONLY</p>
  <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
    <tr>
      <th>Name of customer as in Bank Account.</th>
      <th>Name of Bank.</th>
      <th>Bank IFSC Code</th>
      <th>Bank Account Number.</th>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </table>
  <p>Also attached cheque copy as its mandatory now</p>
  <p>Sir, Bill clearance process usually takes 48 - 72 Working Hours at the maximum as per Our guidelines excluding Saturday and Sundays or national holidays. Request you to kindly revert back with the said details so that we may initiate refund as per our guidelines.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Claims Team HealthMitra</strong></p>
</div>
`;

export const billReimbursementVaccinationTemplate = ({ customerName, amount, percentage, taxAmount }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>We have undergone investigations on the said refund of yours towards Vaccination charges. As per telephonic Conversation/Email with our Claims Team Member we are supposed to do a Refund of INR ${amount}/- towards service Vaccination Refund to your account without TAX.</p>
  <p>Vaccinations cleared at ${percentage}% Less 18% Tax inr ${taxAmount}</p>
  <p>Request you to kindly use HealthMitra verified labs and Get between 30% to 50% Discount of tests.</p>
  <p>Please Send bills within 30 days of Bill being acquired. Bills older than the same will not be entertained.</p>
  <p>Prescriptions are required for Clearance of Medicine bills.</p>
  <p>Emails over 10 MB don’t reach us kindly break the email down in parts.</p>
  <p>We are in the meantime requesting you for details so that the partial service refund for the same may be initialized from our end towards Service Delivery.</p>
  
  <p><strong>Details Required:</strong></p>
  <p>In below mentioned Format ONLY and In the Columns Mentioned Below ONLY</p>
  <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
    <tr>
      <th>Name of customer as in Bank Account.</th>
      <th>Name of Bank.</th>
      <th>Bank IFSC Code</th>
      <th>Bank Account Number.</th>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </table>
  <p>Also attached cheque copy as its mandatory now</p>
  <p>Sir, Bill clearance process usually takes 48 - 72 Working Hours at the maximum as per Our guidelines excluding Saturday and Sundays or national holidays. Request you to kindly revert back with the said details so that we may initiate refund as per our guidelines.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Claims Team HealthMitra</strong></p>
</div>
`;

export const opdBillReimbursementActionRequiredTemplate = ({ customerName, amount, percentage }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings from HealthMitra!</p>
  <p>We are pleased to inform you that your claim for OPD charges has been approved. After reviewing your refund request, we are processing a refund of INR ${amount}/- (excluding tax) towards your OPD services.</p>
  <p>As per our discussion via phone/email with a Claims Team member, the OPD charges have been cleared at ${percentage}%, with an 18% tax deduction applied.</p>
  <p>To avail of future benefits, we encourage you to use HealthMitra-verified labs, where you can receive discounts of 30% to 50% on various tests.</p>
  
  <p><strong>Important Information:</strong></p>
  <ul>
    <li>Kindly submit all bills within 30 days of the billing date. Bills older than this will not be processed.</li>
    <li>Prescriptions are required for clearing medicine bills.</li>
    <li>Emails exceeding 10 MB may not reach us; please break them into smaller parts if necessary.</li>
  </ul>
  
  <p>In order to process the partial refund, we kindly request you to provide the following details in the specified format:</p>
  <p><strong>Bank Details:</strong></p>
  <ol>
    <li>Name of the customer (as per the bank account)</li>
    <li>Name of the bank</li>
    <li>Bank IFSC Code</li>
    <li>Bank Account Number</li>
  </ol>
  <p>Please also attach a copy of your cheque, as this is now mandatory for processing.</p>
  <p><strong>Processing Timeline:</strong> The bill clearance process typically takes 48 to 72 working hours, excluding Saturdays, Sundays, and national holidays. Kindly share the required details at your earliest convenience so we can initiate the refund process as per our guidelines.</p>
  <p>Thank you for choosing HealthMitra. We look forward to serving you again.</p>
  <br/>
  <p>Best regards,<br/><strong>Claims Team HealthMitra</strong></p>
  <p><em>This is an Auto Generated Email</em></p>
</div>
`;


// 4. Bill Rejected
export const billRejectedTemplate = ({ customerName, remarks }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>Bill not approved due to following reasons.</p>
  <p><strong>Remarks:</strong> ${remarks}</p>
  <p>Kindly resolve the same and re-upload the said bill if the issue highlighted from our end has been resolved by you.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Claims Team HealthMitra</strong></p>
</div>
`;

// 5. Franchise Email
export const franchiseWelcomeTemplate = ({ franchiseName, userId, password }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${franchiseName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>We are Happy to welcome you to the HealthMitra Parivar.</p>
  <p>Following are your Login Credentials to Login into the CRM and Check sales done by you or your team.</p>
  <p>User ID: ${userId}</p>
  <p>Password: ${password}</p>
  <p>Link for Login is as follows.<br/><a href="https://www.healthmitraus.com">www.healthmitraus.com</a></p>
  <br/>
  <p>Regards<br/>Tech Team<br/>HealthMitra</p>
</div>
`;

// 6. Mobile Whatsapp Msg
export const generateWhatsAppPurchaseMsg = (name: string, amount: string | number) => 
  `Dear ${name}, Thank you for purchasing your Preventive Health care Plan from HealthMitra, Using your Banking to pay for INR ${amount}. Regards HealthMitra 9818823106.`;

// 7. Message post bill approved
export const paymentApprovedMsgTemplate = ({ customerName }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>Kindly approve the payment approved from our end so that we may Credit the same into your E wallet.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Claims Team HealthMitra</strong></p>
</div>
`;

// 8. Ewallet Redemption
export const ewalletRedemptionToCustomerTemplate = ({ customerName, amount, transactionId }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>We have approved your request for INR ${amount} redemption into your bank account. The same will be credited to you within the next 72 working hours excluding Saturday and Sunday or any bank holidays.</p>
  <p>NEFT details are as follows ${transactionId}</p>
  <p>Kindly ensure that you have updated your bank account correctly in the profile section of your CRM portal.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Claims Team HealthMitra</strong></p>
</div>
`;

export const ewalletRedemptionToAdminTemplate = ({ customerName, amount, requestId }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Redemption request for ${customerName} for request id of INR ${amount} has been received kindly clear the same within the next 72 working hours.</p>
  <br/>
  <p>Regards,<br/><strong>Admin team</strong></p>
</div>
`;

export const ewalletRefundInitiatedTemplate = ({ amount, utrNo, date }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected Customer,</p>
  <p>Greetings from HealthMitra.</p>
  <p>As communicated by our Claims Team, a HealthMitra Ewallet refund of INR ${amount} has been initiated and will be transferred to your account via UTR No. ${utrNo} from Bank of Baroda. Please note that it may take up to 3 working days for the payment to reflect in your account.</p>
  <p>The amount will be processed via NEFT by ${date}. We kindly request you to confirm once the payment has been credited to your account.</p>
  <p>For any further assistance, please feel free to contact us at +91 9818823106 or email us at service@healthmitraus.com.</p>
  <p>Thank you for your patience and understanding.</p>
  <br/>
  <p>Best regards,<br/><strong>Customer Care Team<br/>HealthMitra<br/>+91 9818823106</strong></p>
</div>
`;

export const ewalletRefundNotInitiatedTemplate = ({ amount }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected Customer,</p>
  <p>Greetings from HealthMitra.</p>
  <p>Your request for HealthMitra Ewallet Refund Not Initiated for Amount ${amount} due to No or Incorrect bank details kindly remove the error and reapply for Ewallet transfer.</p>
  <p>For any further assistance, please feel free to contact us at +91 9818823106 or email us at service@healthmitraus.com.</p>
  <p>Thank you for your patience and understanding.</p>
  <br/>
  <p>Best regards,<br/><strong>Customer Care Team<br/>HealthMitra<br/>+91 9818823106</strong></p>
</div>
`;

export const ewalletRefundNotInitiatedActionTemplate = ({ customerName, amount }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>Greetings from HealthMitra.</p>
  <p>We regret to inform you that your request for an Ewallet refund of ${amount} has not been initiated due to incorrect or missing bank details. To proceed with the refund, please correct the information and reapply for the Ewallet transfer.</p>
  <p>If you need any further assistance, please don't hesitate to contact us at +91 9818823106 or via email at service@healthmitraus.com.</p>
  <p>We appreciate your patience and understanding.</p>
  <br/>
  <p>Best regards,<br/><strong>Customer Care Team<br/>HealthMitra<br/>+91 9818823106</strong></p>
</div>
`;

// 9. Bill upload timeline
export const billUploadTimelineTemplate = ({ customerName }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>We have received your request for bill reimbursment.The same will be cleared to you within the next 72 working hours excluding Saturday and Sunday or any bank holidays.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Claims Team HealthMitra</strong></p>
</div>
`;

// 10. Admin Notifications
export const adminBillUploadedTemplate = ({ adminName, customerName, ticketId, type }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${adminName || 'Admin'},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>Kindly note ${customerName}, has uploaded a Bill via Ticket ID ${ticketId} for reimbursement. KIndly check and approve of the same.</p>
  <br/>
  <p>Regards,<br/><strong>Claims Team</strong></p>
</div>
`;

export const adminTicketUploadedRedemptionTemplate = ({ adminName, customerName, type, ticketId }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${adminName || 'Admin'},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>Kindly note ${customerName}, has requested for ${type} via Ticket ID ${ticketId} for service. KIndly check and approve of the same.</p>
  <br/>
  <p>Regards,<br/><strong>Claims Team</strong></p>
</div>
`;

export const adminTicketApprovedTemplate = ({ adminName, customerName, type, ticketId, remarks }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${adminName || 'admin'},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>Kindly note the following a request for ${type} via Ticket ID ${ticketId} for service has been approved ${remarks ? `(${remarks})` : ''} for ${customerName}</p>
  <p>Service will be done within the next 24 to 72 working hours or less.</p>
  <br/>
  <p>Regards,<br/><strong>Claims Team</strong></p>
</div>
`;

// 11. Customer Ticket Uploaded/Approved
export const customerTicketUploadedTemplate = ({ customerName, type, ticketId }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>Kindly note the following a request for ${type} via Ticket ID ${ticketId} for service has been received. We will service you within the next 24 to 72 working hours or less.</p>
  <br/>
  <p>Regards,<br/><strong>Claims Team</strong></p>
</div>
`;

export const customerReimbursementRequestTemplate = ({ customerName, type, ticketId }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>Kindly note the following a request for reimbursement for ${type} via Ticket ID ${ticketId} for service has been received. We will service you within the next 72 working hours excluding Saturday or Sunday and national holidays .</p>
  <br/>
  <p>Regards,<br/><strong>Claims Team</strong></p>
</div>
`;

export const customerServiceApprovedTemplate = ({ customerName, type, ticketId, remarks }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Respected ${customerName},</p>
  <p>Greetings of the day from HealthMitra.</p>
  <p>Kindly note the following a request for ${type} via Ticket ID ${ticketId} for service has been approved ${remarks ? `(${remarks})` : ''}</p>
  <p>We will service you within the next 24 to 72 working hours or less.</p>
  <br/>
  <p>Regards,<br/><strong>Claims Team</strong></p>
</div>
`;

// 12. Plan Purchase & Receipts
export const planPurchaseConfirmationTemplate = ({ customerName, userId, password, planName, transactionId, amount, partnerName, planUrl }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName},</p>
  <p>Greetings of the Day from HealthMitra.</p>
  <p>Your user id is <strong>${userId}</strong> and Password is <strong>${password}</strong> (do not share with anyone).</p>
  <p>Thank you for purchasing HealthMitra preventive healthcare membership ${planName} for your family through our payment partner (${partnerName}) via transaction id (${transactionId}) for INR (${amount}).</p>
  <p>Below mentioned plan details are for your reference: <strong>${planName}</strong>${planUrl ? ` — <a href="${planUrl}">View Plan Details</a>` : ''}</p>
  <p>How to Use HealthMitra.co.in WebCRM <a href="https://youtube.com/playlist?list=PLJ901-wtAm8ufH3GDhLxZOeb-zTfWBfCp&si=oOnp6JXsDw0JNLAb">Link Here</a>.</p>
  <p>To start utilizing HealthMitra services immediately, please download your e-card(s) using above login details. You can print a copy of your e-card(s). For any further assistance, please call our helpdesk at (+91) 9818823106.</p>
  <p>Linked Herein are the Terms and Conditions for Refund and Cancellation for the HealthMitra.co.in Plan <a href="https://healthmitra.co.in/Refund-Cancellation">https://healthmitra.co.in/Refund-Cancellation</a></p>
  <p>DISCLAIMER: This is an auto generated mail please do not reply to this email. In case you have any queries/clarifications, please email us at service@healthmitraus.com or call our helpdesk at (+91) 9818823106 between 8 am to 8 pm.</p>
  <br/>
  <p>Thanks and Regards,<br/><strong>Team HealthMitra</strong></p>
</div>
`;

export const planPurchaseWelcomeTemplate = ({ customerName, userId, password, planName, transactionId, amount, planUrl }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Subject: Welcome to HealthMitra - Your ${planName} Plan Membership Details</p>
  <p>Dear ${customerName},</p>
  <p>Greetings from HealthMitra!</p>
  <p>We are pleased to confirm your purchase of the HealthMitra Preventive Healthcare Membership - <strong>${planName}</strong>${planUrl ? ` (<a href="${planUrl}">View Plan Details</a>)` : ''}. Your transaction was successfully processed through our payment partner with Transaction ID: ${transactionId} for INR ${amount}</p>
  <p><strong>Your Account Details:</strong></p>
  <ul>
    <li>User ID: ${userId}</li>
    <li>Password: ${password} (Please keep this information confidential)</li>
  </ul>
  <p><strong>How to Get Started:</strong></p>
  <ol>
    <li><strong>Download Your e-Card:</strong> Log in using the above credentials to download and print your e-card(s).</li>
    <li><strong>Explore WebCRM:</strong> Learn how to use HealthMitra’s WebCRM by watching our video tutorials.</li>
  </ol>
  <p>For any questions or further assistance, please don't hesitate to reach out to our helpdesk at (+91) 9818823106 between 8 AM and 8 PM.</p>
  <p>You can review the Terms and Conditions for Refund and Cancellation for your HealthMitra Plan at your convenience.</p>
  <p>Please note: This is an automated email; responses to this email are not monitored. For any inquiries, please contact us at service@healthmitraus.com.</p>
  <p>Thank you for choosing HealthMitra. We are committed to supporting your family’s health and well-being.</p>
  <br/>
  <p>Best regards,<br/><strong>Team HealthMitra</strong></p>
</div>
`;

export const confirmationOfPlanPurchaseTemplate = ({ planName, planUrl }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear Valued Customer,</p>
  <p>Greetings from HealthMitra!</p>
  <p>Thank you for choosing HealthMitra for your healthcare needs. We are pleased to confirm your purchase of the HealthMitra Preventive Healthcare Membership.</p>
  <p>You can view the details of your purchased plan by following this link: <a href="${planUrl || '#'}">View Plan Details</a>.</p>
  <p>Explore WebCRM:</p>
  <p>To help you get started with HealthMitra’s services, we invite you to learn more about our WebCRM platform by watching our <a href="https://youtube.com/playlist?list=PLJ901-wtAm8ufH3GDhLxZOeb-zTfWBfCp&si=oOnp6JXsDw0JNLAb">Video Tutorials</a>. These will guide you through the easy-to-use features and help you make the most of your membership.</p>
  <p>For any questions or further assistance, feel free to reach out to our helpdesk at (+91) 9818823106, available between 8 AM and 8 PM.</p>
  <p>You can also review the Terms and Conditions for refunds and cancellations of your HealthMitra plan at your convenience.</p>
  <p>We look forward to supporting your health journey with us.</p>
  <br/>
  <p>Best regards,<br/><strong>HealthMitra Team</strong></p>
</div>
`;

export const paymentReceiptTemplate = ({ customerName, customerPhone, customerEmail, transactionId, date, planName, amount }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #ccc; padding: 20px;">
  <h2 style="margin-top: 0;">Payment Receipt</h2>
  <p>Hey , ${customerName}. Thank you for Purchasing your Preventive Health Plan from us we’re glad you did. An Email has been sent to your registered Email ID with your User ID and Password .Kindly update the same.</p>
  <hr/>
  <p><strong>Payment No.</strong><br/>${transactionId}</p>
  <p><strong>Payment Date</strong><br/>${date}</p>
  <hr/>
  <p><strong>Client</strong><br/>${customerName}<br/>(+91) ${customerPhone}<br/>${customerEmail}</p>
  <p><strong>Payment To</strong><br/>Health Mitra<br/>(+91) 9818823106<br/>service@healthmitraus.com</p>
  <p><strong>Description</strong><span style="float: right;"><strong>Amount</strong></span></p>
  <hr/>
  <p>${planName}<span style="float: right;">₹ ${amount}</span></p>
  <hr/>
  <p>Total: <span style="float: right;"><strong>₹ ${amount}</strong></span></p>
</div>
`;

// OTHER TEMPLATES

export const walletTopUpSuccessTemplate = ({ customerName, amount, transactionId, newBalance }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${customerName || 'Customer'},</p>
  <p>Greetings from HealthMitra.</p>
  <p>We have successfully received your payment of INR ${amount} towards your HealthMitra E-Wallet.</p>
  <p><strong>Transaction ID:</strong> ${transactionId}</p>
  <p>Your new E-Wallet balance is now: <strong>INR ${newBalance}</strong>.</p>
  <p>You can use your wallet balance to purchase services, book tests, and access premium medical consultations on our platform.</p>
  <br/>
  <p>Best regards,<br/><strong>HealthMitra Team</strong><br/>+91 9818823106</p>
</div>
`;

export const contactUsNotificationTemplate = ({ name, email, phone, message }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <h2>New Contact Us Form Submission</h2>
  <p>A new query has been submitted via the HealthMitra Get In Touch form:</p>
  <ul>
    <li><strong>Name:</strong> ${name}</li>
    <li><strong>Email:</strong> ${email}</li>
    <li><strong>Phone:</strong> ${phone || 'N/A'}</li>
  </ul>
  <p><strong>Message:</strong></p>
  <p>${message}</p>
  <br/>
  <p>Please follow up with the user within 24 hours.</p>
</div>
`;

export const medicalConsultationRequestTemplate = ({ name, email, phone, specialty, date, preferredTime, symptoms }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <h2>New Medical Consultation Request</h2>
  <p>A user has requested a medical consultation from their dashboard:</p>
  <ul>
    <li><strong>Patient Name:</strong> ${name}</li>
    <li><strong>Email:</strong> ${email}</li>
    <li><strong>Phone:</strong> ${phone}</li>
    <li><strong>Specialty Requested:</strong> ${specialty}</li>
    <li><strong>Preferred Date:</strong> ${date}</li>
    <li><strong>Preferred Time:</strong> ${preferredTime}</li>
  </ul>
  <p><strong>Symptoms/Notes:</strong></p>
  <p>${symptoms || 'None provided'}</p>
  <br/>
  <p>Please arrange the consultation and notify the user.</p>
</div>
`;

export const partnerApplicationNotificationTemplate = ({ name, email, phone, city, state }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <h2>New Partner Application Received</h2>
  <p>A new partner application has been submitted via the website:</p>
  <ul>
    <li><strong>Partner Name:</strong> ${name}</li>
    <li><strong>Email:</strong> ${email}</li>
    <li><strong>Phone:</strong> ${phone}</li>
    <li><strong>Location:</strong> ${city}, ${state}</li>
  </ul>
  <p>Please review the application in the Admin Panel.</p>
  <br/>
  <p>Best regards,<br/><strong>HealthMitra System</strong></p>
</div>
`;

export const partnerApplicationConfirmationTemplate = ({ name }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${name},</p>
  <p>Greetings from HealthMitra!</p>
  <p>Thanks for filling partner form. We have received your application and it is currently under review by our team.</p>
  <p>We will get back to you shortly with the next steps.</p>
  <p>If you have any questions, feel free to contact our support desk.</p>
  <br/>
  <p>Best regards,<br/><strong>Team HealthMitra</strong></p>
</div>
`;

export const partnerApplicationAcceptedTemplate = ({ name }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${name},</p>
  <p>Greetings from HealthMitra!</p>
  <p>Congratulations! Your partner application has been accepted.</p>
  <p>We are excited to welcome you to the HealthMitra network. You will receive further instructions shortly regarding your onboarding process and access to your partner dashboard.</p>
  <br/>
  <p>Best regards,<br/><strong>Team HealthMitra</strong></p>
</div>
`;

export const partnerApplicationRejectedTemplate = ({ name }: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <p>Dear ${name},</p>
  <p>Greetings from HealthMitra!</p>
  <p>Thank you for your interest in partnering with us. Unfortunately, after careful review, we are unable to accept your application at this time.</p>
  <p>We wish you the best in your future endeavors.</p>
  <br/>
  <p>Best regards,<br/><strong>Team HealthMitra</strong></p>
</div>
`;
