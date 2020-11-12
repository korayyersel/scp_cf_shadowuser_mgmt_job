1. Login to General space on the subaccount (cf login)
2. Call following CLI commands	
   * cf create-service xsuaa apiaccess general-apiaccess
   * cf create-service-key general-apiaccess general-apiaccess-key
   * cf service-key general-apiaccess general-apiaccess-key
3.	Subaccount > Space: Generel: Create Job Scheduler Instance "general-jobscheduler" manually with the configuration {"enable-xsuaa-support": true}
4.	cf deploy
5.	If deployment fails call the following CLI command and call cf push under srv
    * cf bind-service shadowuser-mgmt-job-srv general-jobscheduler -c '{\\"xsuaa_instance_name\\":\\"shadowuser-mgmt-job-uaa\\"}' 
6.	Check sensitive data on shadowuser-mgmt-job-srv > general-jobscheduler (it should involve uaa!)