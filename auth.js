// auth.js
window.Auth = (function(){
    function mustFreeze(courseId){
      const status = EJStore.courseStatus(courseId);
      return status === "suspended";
    }
  
    function applyFreezeIfNeeded(courseId){
      const fr = document.getElementById("freeze");
      if(!fr) return;
  
      if(mustFreeze(courseId)){
        fr.style.display = "block";
      }else{
        fr.style.display = "none";
      }
    }
  
    function requireCourseLogin(courseId){
      const u = EJStore.currentCourseUser(courseId);
      if(!u){
        location.href = "login.html";
        return null;
      }
      return u;
    }
  
    function routeByRole(user){
      if(user.role==="courseAdmin") location.href = "course-admin.html";
      else if(user.role==="teacher") location.href = "teacher.html";
      else if(user.role==="student") location.href = "student.html";
      else location.href = "login.html";
    }
  
    return { applyFreezeIfNeeded, requireCourseLogin, routeByRole };
  })();
  